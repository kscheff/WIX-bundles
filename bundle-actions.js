import { decrementInventory, updateInventoryVariantFieldsByProductId } from 'wix-stores-backend';
import { getBundleDataByProductId, findBundlesByProductId, getProductInventory } from './bundle-data.js';

export async function refreshRelatedBundles(inventoryEvent){
	try{
        const variantId = inventoryEvent.variants[0].id;
		const currentBundle=await getBundleDataByProductId("updateProductId", inventoryEvent.productId, variantId);
		if(currentBundle){
            let updatedProduct = await getProductInventory(inventoryEvent.productId + "_" + variantId);
            const newInventory=inventoryEvent.variants[0].newValue;
            updatedProduct.inStock=newInventory.inStock;
            updatedProduct.quantity=newInventory.quantity;
			await refreshBundleStock(currentBundle, updatedProduct);
			return
		}
        let updatedProduct = await getProductInventory(inventoryEvent.productId + "_" + variantId);
		const newInventory=inventoryEvent.variants[0].newValue;
		updatedProduct.inStock=newInventory.inStock;
		updatedProduct.quantity=newInventory.quantity;
			
		const bundleDataArray = await findBundlesByProductId(inventoryEvent.productId, variantId);
		await Promise.all(bundleDataArray.map(async (bundleData) => {
			await refreshBundleStock(bundleData, updatedProduct);
		}));
		return true
	}catch(err){
		throw new Error('bundle-actions > refreshRelatedBundles - original error - ' + err.message);
	}
}
export async function refreshBundleStock(bundleData,updatedProduct=null){
	try{
        let inventoryData=await calculateBundleStock(bundleData, updatedProduct);
        if(inventoryData.isChanged){
            await updateInventoryVariantFieldsByProductId(inventoryData.productId,inventoryData.newValues);
        }
	}catch(err){
		throw new Error('bundle-actions > refreshBundleStock - original error - ' + err.message);
	}
}
export async function calculateBundleStock(bundleData,updatedProduct=null){
	try{
		const childProductList = bundleData.childProductIds.split(",");
		let childProductsInventory=[];
		if(updatedProduct){
			childProductsInventory.push(updatedProduct);
            childProductList.splice(childProductList.indexOf(updatedProduct.productId + "_" + updatedProduct.variantId),1);
		}
		
		await Promise.all(childProductList.map(async (childProductVariant)=>{
            const child = await getProductInventory(childProductVariant);
            if (child) {
				childProductsInventory.push(child);
			}
        }));
		let newInStock=childProductsInventory.every(x=>x.inStock);
		let newQuantity=Math.min(...childProductsInventory.map(x=>x.quantity).filter(y=>Number.isInteger(y)));
		const currentBundleInventory=await getProductInventory(bundleData.bundleProductId + "_" + bundleData.variantId);
		let newVariantInfo={
			trackQuantity: false,
			variants: [{
				inStock: newInStock,
				variantId:currentBundleInventory.variantId,
                quantity: null
			}]
		}
		if(newQuantity!=Infinity && newInStock){
			newVariantInfo.variants[0].quantity=newQuantity;
			newVariantInfo.trackQuantity=true;
		}
		let isChanged=getIsInventoryChanged(newInStock,currentBundleInventory,newVariantInfo);
		let res= {
			newValues:newVariantInfo,
			oldValues:currentBundleInventory,
			productId:bundleData.bundleProductId,
			isChanged:isChanged
		}
		return res;
			
	}catch(err){
		throw new Error('bundle-action > calculateBundleStock - original error - ' + err.message);
	}
}
async function getIsInventoryChanged(newInStock,currentInventory,newVariantInfo){
    try{
        if(newInStock!=currentInventory.inStock){
            return true
        }
        if(newVariantInfo.trackQuantity 
            && currentInventory.trackQuantity 
            && newVariantInfo.variants[0].quantity!=currentInventory.quantity){
            return true
        }
        if(newVariantInfo.trackQuantity!=currentInventory.trackQuantity){
            return true
        }
        return false
    } catch(err){
        throw new Error('bundle-actions.js > isInventoryChanged - original error - ' + err.message);
    }
}
export async function decreaseBundleInventory(orderEvent) {
    try{
        orderEvent.lineItems.forEach(async (item) => {
            const bundleData = await getBundleDataByProductId("bundleProductId", item.productId, item.variantId);
            if (bundleData) {
                const childProductsId = bundleData.childProductIds.split(",");
                await decreaseChildProductsInventory(childProductsId,item.quantity);
            }
        });
        return true
    } catch(err){
        throw new Error('bundle-actions.js > isInventoryChanged - original error - ' + err.message); 
    }
}

async function decreaseChildProductsInventory(childProductsId,decreaseQuantity) {
    await Promise.all(childProductsId.map(async (productId) => {
        const product = await getProductInventory(productId);
        if (product.quantity) {
            await decreaseProductInventory(product,decreaseQuantity);
        }
        else { console.warn("warning: failed decrease child product ", childProductsId); }
    })).catch((err)=>{
        return Promise.reject(new Error('bundle-actions.js > decreaseChildProductsInventory - original error - '+err.message));    
    });
}

async function decreaseProductInventory(product,decreaseQuantity) {
    if (product.trackQuantity) {
        await decrementInventory(
            [{
                variantId: product.variantId,
                productId: product.productId,
                decrementBy: decreaseQuantity,
                inventoryId: undefined
            }])
        .catch((err) => {
            return Promise.reject(new Error('bundle-actions.js > decreaseProductInventory - original error - '+err.message));
        });
    }
}