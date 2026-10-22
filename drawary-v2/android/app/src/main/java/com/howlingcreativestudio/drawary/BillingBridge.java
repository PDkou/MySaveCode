package com.howlingcreativestudio.drawary;

import android.util.Log;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Google Play Billing for the one-time products (see src/flow/premium.ts for the ids):
 *  - premium_unlock: bought once, acknowledged here (Play refunds an unacknowledged purchase after 3 days);
 *  - support_*: "buy the developer a coffee", consumed right after the purchase so they can be bought again.
 * Everything runs on the main thread (Billing's callbacks arrive there). The page talks to this through NativeBridge
 * (`queryBilling` / `purchase`); the shell holds no price or purchase data of its own and never sees a card number.
 */
final class BillingBridge implements PurchasesUpdatedListener {
    private static final String TAG = "Drawary";
    static final String PREMIUM = "premium_unlock";
    private static final List<String> SUPPORT = Collections.unmodifiableList(Arrays.asList(
            "support_coffee", "support_latte",
            "support_tip_1", "support_tip_2", "support_tip_3", "support_tip_4", "support_tip_5", "support_tip_6"));

    private final MainActivity activity;
    private final NativeBridge bridge;
    private BillingClient client;
    /** The page's call id waiting for the purchase sheet's result, or -1. */
    private int purchaseCallId = -1;

    BillingBridge(MainActivity activity, NativeBridge bridge) {
        this.activity = activity;
        this.bridge = bridge;
    }

    void end() {
        if (client != null) {
            client.endConnection();
            client = null;
        }
    }

    private static boolean known(String productId) {
        return PREMIUM.equals(productId) || SUPPORT.contains(productId);
    }

    private static List<String> allProducts() {
        List<String> all = new ArrayList<>();
        all.add(PREMIUM);
        all.addAll(SUPPORT);
        return all;
    }

    // ---- connection ----------------------------------------------------------------------------------------

    /** Runs `ready` once connected to Google Play, or `failed` when Play (or Play Billing) is not there. */
    private void connect(final Runnable ready, final Runnable failed) {
        if (activity.isFinishing() || activity.isDestroyed()) {
            failed.run();
            return;
        }
        if (client == null) {
            client = BillingClient.newBuilder(activity)
                    .setListener(this)
                    .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                    .enableAutoServiceReconnection()
                    .build();
        }
        if (client.isReady()) {
            ready.run();
            return;
        }
        client.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) ready.run();
                else failed.run();
            }

            @Override
            public void onBillingServiceDisconnected() {
                // Reconnects by itself (enableAutoServiceReconnection) the next time something is asked.
            }
        });
    }

    // ---- what the person owns and what things cost ---------------------------------------------------------

    void query(final int id) {
        connect(() -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build();
            client.queryPurchasesAsync(params, (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    bridge.reject(id, "error");
                    return;
                }
                boolean premium = false;
                for (Purchase purchase : purchases) {
                    if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
                    if (purchase.getProducts().contains(PREMIUM)) premium = true;
                    settle(purchase, -1);
                }
                queryPrices(id, premium);
            });
        }, () -> bridge.reject(id, "unavailable"));
    }

    private void queryPrices(final int id, final boolean premium) {
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String productId : allProducts()) {
            products.add(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build());
        }
        client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(products).build(), (result, details) -> {
            JSONObject prices = new JSONObject();
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                for (ProductDetails detail : details.getProductDetailsList()) {
                    ProductDetails.OneTimePurchaseOfferDetails offer = detail.getOneTimePurchaseOfferDetails();
                    if (offer == null) continue;
                    try {
                        prices.put(detail.getProductId(), offer.getFormattedPrice());
                    } catch (JSONException e) {
                        Log.w(TAG, "Price not added", e);
                    }
                }
            }
            JSONObject answer = new JSONObject();
            try {
                answer.put("premium", premium);
                answer.put("prices", prices);
            } catch (JSONException e) {
                bridge.reject(id, "error");
                return;
            }
            bridge.resolve(id, answer.toString());
        });
    }

    // ---- buying --------------------------------------------------------------------------------------------

    void purchase(final int id, final String productId) {
        if (!known(productId)) {
            bridge.resolve(id, "\"error\"");
            return;
        }
        if (purchaseCallId != -1) {
            bridge.resolve(id, "\"error\"");
            return;
        }
        connect(() -> {
            List<QueryProductDetailsParams.Product> one = Collections.singletonList(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build());
            client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(one).build(), (result, details) -> {
                List<ProductDetails> found = result.getResponseCode() == BillingClient.BillingResponseCode.OK
                        ? details.getProductDetailsList() : Collections.<ProductDetails>emptyList();
                if (found.isEmpty()) {
                    bridge.resolve(id, "\"unavailable\"");
                    return;
                }
                BillingFlowParams flow = BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(Collections.singletonList(
                                BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(found.get(0)).build()))
                        .build();
                purchaseCallId = id;
                BillingResult started = client.launchBillingFlow(activity, flow);
                if (started.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    purchaseCallId = -1;
                    bridge.resolve(id, started.getResponseCode() == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED ? "\"owned\"" : "\"error\"");
                }
            });
        }, () -> bridge.resolve(id, "\"unavailable\""));
    }

    /** The purchase sheet's result. */
    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        final int id = purchaseCallId;
        purchaseCallId = -1;
        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.OK && purchases != null && !purchases.isEmpty()) {
            Set<Integer> answered = new HashSet<>();
            for (Purchase purchase : purchases) {
                if (answered.add(id)) settle(purchase, id);
                else settle(purchase, -1);
            }
        } else if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            if (id != -1) bridge.resolve(id, "\"cancelled\"");
        } else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            if (id != -1) bridge.resolve(id, "\"owned\"");
        } else if (id != -1) {
            bridge.resolve(id, "\"error\"");
        }
    }

    /**
     * Finishes one purchase: pending ones wait; premium is acknowledged; support products are consumed (so they can be
     * bought again). `callId` (-1 = nobody waiting) is answered once it is done.
     */
    private void settle(final Purchase purchase, final int callId) {
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
            if (callId != -1) bridge.resolve(callId, "\"pending\"");
            return;
        }
        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
            if (callId != -1) bridge.resolve(callId, "\"error\"");
            return;
        }
        if (purchase.getProducts().contains(PREMIUM)) {
            if (purchase.isAcknowledged()) {
                if (callId != -1) bridge.resolve(callId, "\"ok\"");
                return;
            }
            client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build(), ack -> {
                if (callId == -1) return;
                // Not acknowledged yet is still bought: Play keeps the purchase and it is acknowledged on the next start.
                bridge.resolve(callId, "\"ok\"");
            });
            return;
        }
        client.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build(), (consume, token) -> {
            if (consume.getResponseCode() != BillingClient.BillingResponseCode.OK) Log.w(TAG, "Support purchase not consumed yet");
            if (callId != -1) bridge.resolve(callId, "\"ok\"");
        });
    }
}
