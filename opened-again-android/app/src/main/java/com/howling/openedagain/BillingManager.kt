package com.howling.openedagain

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams

// v0.65: director-approved monetization ; the one-time (non-consumable)
// "remove ads" purchase via Google Play Billing, paired with the small
// cosmetic bonus the director asked for as part of "1번" (see index.html's
// settings row and cosmetic-unlock handling -- the cosmetic itself is a
// separate, later content decision, this class only owns the purchase
// mechanics and the persisted "did they buy it" flag).
//
// PRODUCT_ID_REMOVE_ADS below must be created by the director in Play
// Console (Monetize -> Products -> In-app products, one-time/managed
// product) with this exact ID before a real purchase can ever succeed --
// until then launchBillingFlow() fails with "item unavailable", same as
// any app whose IAP hasn't been configured yet.
class BillingManager(
    private val activity: Activity,
    private val onAdsRemovedChanged: (Boolean) -> Unit
) {
    companion object {
        const val PRODUCT_ID_REMOVE_ADS = "remove_ads"
        private const val PREFS = "app_prefs"
        private const val KEY_ADS_REMOVED = "ads_removed"
    }

    // Reuses the same "app_prefs" SharedPreferences file NativeBridge's
    // setLanguage() already writes to -- one small native prefs file for
    // this app's few cross-session native flags, not a new file per feature.
    private val prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private var productDetails: ProductDetails? = null

    fun isAdsRemoved(): Boolean = prefs.getBoolean(KEY_ADS_REMOVED, false)

    private val purchasesListener = PurchasesUpdatedListener { result, purchases ->
        if (result.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            purchases.forEach(::handlePurchase)
        }
    }

    private val client: BillingClient = BillingClient.newBuilder(activity)
        .setListener(purchasesListener)
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .build()

    // Called once from MainActivity.onCreate(). Connects, then fetches the
    // product's real price/details and re-checks ownership (queryPurchasesAsync
    // is the official way to restore a non-consumable across
    // reinstalls/devices signed into the same Play account -- no server of
    // our own needed).
    fun start() {
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    queryProductDetails()
                    restorePurchases()
                }
            }
            override fun onBillingServiceDisconnected() {
                // BillingClient reconnects lazily on the next call that
                // needs it; nothing to do here for a one-time-purchase flow.
            }
        })
    }

    private fun queryProductDetails() {
        val product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(PRODUCT_ID_REMOVE_ADS)
            .setProductType(BillingClient.ProductType.INAPP)
            .build()
        val params = QueryProductDetailsParams.newBuilder().setProductList(listOf(product)).build()
        client.queryProductDetailsAsync(params) { result, list ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                productDetails = list.productDetailsList.firstOrNull()
            }
        }
    }

    // NativeBridge.purchaseRemoveAds() -> index.html's "광고 제거" settings row.
    fun purchaseRemoveAds() {
        val details = productDetails
        if (details == null) {
            // Not loaded yet (client still connecting, or the product isn't
            // configured in Play Console yet) -- retry the fetch so a
            // second tap has a better chance; nothing to launch this time.
            if (client.connectionState == BillingClient.ConnectionState.CONNECTED) queryProductDetails()
            return
        }
        val productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(details)
            .build()
        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productParams))
            .build()
        activity.runOnUiThread { client.launchBillingFlow(activity, flowParams) }
    }

    // NativeBridge.restorePurchases() -> index.html's "구매 복원" settings row.
    fun restorePurchases() {
        val params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()
        client.queryPurchasesAsync(params) { result, purchases ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                purchases.forEach(::handlePurchase)
            }
        }
    }

    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return
        if (!purchase.products.contains(PRODUCT_ID_REMOVE_ADS)) return
        setAdsRemoved(true)
        // Non-consumables must be acknowledged within 3 days or Play
        // Billing auto-refunds them -- acknowledge immediately on first sight.
        if (!purchase.isAcknowledged) {
            val ackParams = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.purchaseToken)
                .build()
            client.acknowledgePurchase(ackParams) {}
        }
    }

    private fun setAdsRemoved(removed: Boolean) {
        if (isAdsRemoved() == removed) return
        prefs.edit().putBoolean(KEY_ADS_REMOVED, removed).apply()
        onAdsRemovedChanged(removed)
    }
}
