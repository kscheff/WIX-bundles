import {refreshRelatedBundles,decreaseBundleInventory} from './bundle-actions.js';

export function wixStores_onOrderPaid(event) { 
    try { 
        event.lineItems.map( (item) => {
        });
        decreaseBundleInventory(event);
    }
    catch (e) {
        console.error('error in wixStores_onOrderPaid - '  + e.message);
    }
}

export function wixStores_onInventoryVariantUpdated(event) { 
    
    try { 
        if (event.reason == "MANUAL") { 
            console.log("manual update: ", {event});
            refreshRelatedBundles(event);
        }
    }
    catch (e) {
        console.error('error in wixStores_onInventoryVariantUpdated - '  + e.message);
    }
    
}
