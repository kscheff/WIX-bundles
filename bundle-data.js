import wixData from 'wix-data';

export async function getBundleDataByProductId(key,value,variantId) {
    return await wixData.query("Bundles")
        .eq(key, value)
        .eq("variantId", variantId)
        .find()
        .then((results) => {
            if (results.length > 0) {
                return results.items[0];
            } else {
                return null;
            }
        })
        .catch((err) => {
            return Promise.reject(new Error('bundle-data.js > getBundleDataByKey - original error - '+err.message));
        });
}
export async function findBundlesByProductId(productId,variantId) {
    const productVariant = productId + "_" + variantId;
    return await wixData.query("Bundles")
        .contains("childProductIds", productVariant)
        .find()
        .then(async (results) => {
            if (results.length > 0) {
                return results.items.filter(function(bundleData) {
                    return bundleData.childProductIds.split(",").indexOf(productVariant) > -1;
                });
            } else {
                return [];
            }
        })
        .catch((err) => {
            return Promise.reject(new Error('bundle-data.js > findBundlesByProductId - original error - '+err.message));
            
        });
}
export async function getProductInventory(productVariant){
    // if child productId might be chained via underscore with variantId
    var [productId, variantId] = (productVariant + "_00000000-0000-0000-0000-000000000000").split("_");
    return await wixData.query("Stores/InventoryItems")
        .eq('productId',productId)
        .find()
        .then((results)=>{
            if(results.length>0){
                let result=results.items[0];
                let variant=result.variants.filter(v => v.variantId == variantId)[0];
                return {
                    'productId':result.productId,
                    'trackQuantity':result.trackQuantity,
                    'inStock': variant.inStock,
                    'quantity': variant.quantity,
                    'variantId':variant.variantId
                }
            } else {
                return null;
            }
        }).catch( (err) =>{
            return Promise.reject(new Error('bundle-data.js > getProductInventory - original error - '+err.message));
        })
}