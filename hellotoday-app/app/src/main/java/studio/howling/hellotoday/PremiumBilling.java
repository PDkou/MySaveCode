package studio.howling.hellotoday;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.WebView;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import java.util.Collections;
import java.util.List;

/**
 * Wraps Google Play Billing for the single paid unlock: a one-time,
 * non-consumable purchase (PRODUCT_ID) framed to the user as "remove ads"
 * (InterstitialAdManager checks the same flag) that also, as a bundled
 * bonus, lifts the free tier's FREE_PEOPLE_LIMIT cap enforced in
 * index.html's openPerson(). One purchase, two effects -- there's no
 * separate ads-only or people-only product.
 *
 * Owned by MainActivity for the Activity's lifetime. Pushes state into the
 * WebView via window.onPremiumStatus/onPremiumPrice/onPurchaseFailed --
 * same evaluateJavascript pattern NativeBridge already uses elsewhere in
 * MainActivity, just originating from billing callbacks instead of a JS
 * bridge call. (The window.* callback names still say "Premium" -- that's
 * the internal/code-level name for this unlock; only the user-facing copy
 * in index.html frames it as ad removal.)
 *
 * The in-app product with this ID has to be created in Play Console
 * (Monetize > Products > In-app products) before a real purchase can
 * succeed -- nothing here can create it remotely.
 *
 * No backend: purchases are trusted from BillingClient's own response
 * (PURCHASED state) rather than server-side receipt verification, which
 * this app has no server to do. That's an accepted tradeoff for a small
 * personal-use unlock, not an oversight -- revisit if this product line
 * ever becomes worth attacking.
 */
final class PremiumBilling implements PurchasesUpdatedListener {
    // Renamed from premium_unlimited_people (2026-08-27) to match the new
    // ad-removal framing, before any real Play Console product existed --
    // safe to rename freely at this stage, would not be once real
    // purchases existed against the old ID.
    static final String PRODUCT_ID = "remove_ads";
    private static final String PREFS = "hello_today_premium";
    private static final String KEY_UNLOCKED = "unlocked";

    private final Activity activity;
    private final WebView web;
    private final BillingClient client;
    private volatile ProductDetails productDetails;

    PremiumBilling(Activity activity, WebView web) {
        this.activity = activity;
        this.web = web;
        this.client = BillingClient.newBuilder(activity)
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .enableAutoServiceReconnection()
                .build();
    }

    void start() {
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    queryProductDetails();
                    refreshOwnedPurchases();
                }
            }
            @Override public void onBillingServiceDisconnected() {
                // enableAutoServiceReconnection() handles retrying; nothing to do here.
            }
        });
    }

    /** Fast, synchronous read for NativeBridge.isPremium() -- last known state, not a live query. */
    boolean isUnlockedCached() {
        return prefs().getBoolean(KEY_UNLOCKED, false);
    }

    void launchPurchase() {
        ProductDetails details = productDetails;
        List<ProductDetails.OneTimePurchaseOfferDetails> offers =
                details == null ? null : details.getOneTimePurchaseOfferDetailsList();
        if (details == null || offers == null || offers.isEmpty()) {
            runJs("window.onPurchaseFailed&&window.onPurchaseFailed()");
            return;
        }
        BillingFlowParams.ProductDetailsParams detailsParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details)
                .setOfferToken(offers.get(0).getOfferToken())
                .build();
        BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(detailsParams))
                .build();
        activity.runOnUiThread(() -> client.launchBillingFlow(activity, flowParams));
    }

    /** Re-derives unlock state from Play's own purchase records (source of truth, not localStorage). */
    void refreshOwnedPurchases() {
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build();
        client.queryPurchasesAsync(params, (billingResult, purchases) -> {
            boolean owned = false;
            for (Purchase purchase : purchases) {
                if (purchase.getProducts().contains(PRODUCT_ID)
                        && purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    owned = true;
                    acknowledgeIfNeeded(purchase);
                }
            }
            setUnlocked(owned);
        });
    }

    @Override public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) handlePurchase(purchase);
        } else if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.USER_CANCELED) {
            runJs("window.onPurchaseFailed&&window.onPurchaseFailed()");
        }
        // USER_CANCELED: the user backed out of the flow -- nothing to unlock or report.
    }

    private void handlePurchase(Purchase purchase) {
        if (!purchase.getProducts().contains(PRODUCT_ID)) return;
        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) return; // PENDING settles later via a fresh onPurchasesUpdated
        acknowledgeIfNeeded(purchase);
        setUnlocked(true);
    }

    private void acknowledgeIfNeeded(Purchase purchase) {
        if (purchase.isAcknowledged()) return;
        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();
        // Best-effort: ownership is already granted off getPurchaseState() above:
        // Play auto-refunds unacknowledged purchases after ~3 days, so failing
        // silently here just risks a retried acknowledge next refreshOwnedPurchases(),
        // not a lost entitlement while the app is in use.
        client.acknowledgePurchase(params, ignored -> { });
    }

    private void queryProductDetails() {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_ID)
                .setProductType(BillingClient.ProductType.INAPP)
                .build();
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(product))
                .build();
        client.queryProductDetailsAsync(params, (billingResult, result) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) return;
            List<ProductDetails> list = result.getProductDetailsList();
            if (list.isEmpty()) return;
            productDetails = list.get(0);
            List<ProductDetails.OneTimePurchaseOfferDetails> offers = productDetails.getOneTimePurchaseOfferDetailsList();
            String price = (offers != null && !offers.isEmpty()) ? offers.get(0).getFormattedPrice() : "";
            runJs("window.onPremiumPrice&&window.onPremiumPrice(" + jsString(price) + ")");
        });
    }

    private void setUnlocked(boolean unlocked) {
        prefs().edit().putBoolean(KEY_UNLOCKED, unlocked).apply();
        runJs("window.onPremiumStatus&&window.onPremiumStatus(" + unlocked + ")");
    }

    private SharedPreferences prefs() {
        return activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private void runJs(String js) {
        activity.runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    private static String jsString(String s) {
        return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'";
    }
}
