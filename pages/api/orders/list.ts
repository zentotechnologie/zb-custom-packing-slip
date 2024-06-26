import { NextApiRequest, NextApiResponse } from 'next';
import { URLSearchParams } from 'url';
import { bigcommerceClient, getSession } from '../../../lib/auth';

export default async function list(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { accessToken, storeHash } = await getSession(req);
        const bigcommerce = bigcommerceClient(accessToken, storeHash, 'v2');
        const bigcommerceV3 = bigcommerceClient(accessToken, storeHash);
        const { page, limit, sort, direction, include, status_id } = req.query;
        const params = decodeURIComponent(new URLSearchParams({ page, limit, include, status_id, ...(sort && {sort: `${sort}:${direction}`}) }).toString());

        console.log('***********************');
        console.log('1', params);
        console.log('***********************');

        let rawResponse = undefined;
        try {
            rawResponse = await bigcommerce.get(`/orders?${params}`);
        } catch (error) {
            console.log(`list on /orders?${params} : TROW ERROR`);
            throw error;
        }
        
        console.log('***********************');
        console.log('2');
        console.log('***********************');

        const response = await Promise.all(rawResponse.map(async (order: any) => {
            const { id } = order;
            if (id == 121) {
                // console.log('***********************');
                // console.log(`HERE .${id}`);
                // console.log('***********************');
            }
            // console.log('***********************');
            // console.log(`2.1.${id} -- ${order.products.resource}`);
            // console.log('***********************');
            let rawProducts = [];
            try {
                let page = 0;
                const limit = 50;
                let condition = true;
                do {
                    page += 1;
                    const thisRawProducts = await bigcommerce.get(`${order.products.resource}?page=${page}&limit=${limit}`);
                    console.log(`list on /orders/${id}/products for page ${page} : got ${thisRawProducts.length} products`);
                    rawProducts.push(...thisRawProducts);
                    condition = thisRawProducts.length === limit;
                } while (condition)
                console.log(`list on /orders/${id}/products : got ${rawProducts.length} products for all pages`);
            } catch (error) {
                console.log(`list on /orders/${id}/products : error`, order.products.resource, error);
            }
            // console.log('***********************');
            // console.log(`2.2.${id}`);
            // console.log('***********************');
            let products = [];
            try {
                products = (await Promise.all(rawProducts.map(async (product: any) => {
                
                    if (product.variant_id == 121) {
                        // console.log('***********************');
                        // console.log(`HERE .${id} variant ${product.variant_id}`);
                        // console.log('***********************');
                    }
                    
                    if (product.product_id == 121) {
                        // console.log('***********************');
                        // console.log(`HERE .${id} product ${product.product_id}`);
                        // console.log('***********************');
                    }
                    if (!product.variant_id) {
                        try {
                            // console.log(`list item on /catalog/products/${product.product_id} : START`);
                            const p = await bigcommerceV3.get(`/catalog/products/${product.product_id}`, { include: 'primary_image' });
                            // console.log(`list item on /catalog/products/${product.product_id} : END`);
                            return {...product, ...p, qty: product.quantity};
                        } catch (error) {
                            console.log(`list item on /catalog/products/${product.product_id} : TROW ERROR`, error);
                            return undefined;
                        }
                    } else {
                        try{
                            // console.log(`list item on /catalog/products/${product.product_id}/variants/${product.variant_id} : START`);
                            const p = await bigcommerceV3.get(`/catalog/products/${product.product_id}/variants/${product.variant_id}`, { include: 'primary_image' });
                            // console.log(`list item on /catalog/products/${product.product_id}/variants/${product.variant_id} : END`);
                            return {...product, ...p, qty: product.quantity};
                        } catch (error) {
                            console.log(`list item on /catalog/products/${product.product_id}/variants/${product.variant_id} : TROW ERROR`, error);
                            return undefined;
                        }
                    }
                }))).filter(Boolean)
            } catch (error) {
                console.log(`list on /orders/${id}/products : error`, error);
            }
            // console.log('***********************');
            // console.log(`2.3.${id} -- ${order.shipping_addresses.resource} -- ${order.coupons.resource}`);
            // console.log('***********************');
            let shippingAddresses = [];
            try {
                shippingAddresses = await bigcommerce.get(order.shipping_addresses.resource);
            } catch (error) {
                console.log(`list on /orders/${id}/shipping_addresses : error`);
            }
            let coupons = [];
            try {
                coupons = await bigcommerce.get(order.coupons.resource);
            } catch (error) {
                console.log(`list on /orders/${id}/coupons : error`);
            }

            const customerID = order.customer_id;
            let rawCustomerGroupResponse = null;
            try {
                const rawCustomerResponse = await bigcommerceV3.get(`/customers?id:in=${customerID}&include=formfields`);
                if (rawCustomerResponse && rawCustomerResponse.data && rawCustomerResponse.data[0]) {
                    const customer = rawCustomerResponse.data[0];
                    // console.log("Customer ::: ", customer);
                    const customerGroupId = customer.customer_group_id;
                    const name = customer.company || `${customer.first_name} ${customer.last_name}`;
                    const visibilityField = customer.form_fields.find((ff: {name: string, value?: any}) => ff.name === "VISIBILITE CATALOGUE");
                    const visibility = visibilityField ? (visibilityField.value || "N/A") : "N/A";
                    const codeClientField = customer.form_fields.find((ff: {name: string, value?: any}) => ff.name === "CODE CLIENT");
                    const codeClient = codeClientField ? (codeClientField.value || "N/A") : "N/A";
                    rawCustomerGroupResponse = {code: codeClient, name, visibility};
                    //console.log("rawCustomerGroupResponse ::: ", rawCustomerGroupResponse);
                    /*
                    if (!customerGroupId) {
                    } else {
                        rawCustomerGroupResponse = await bigcommerce.get(`/customer_groups/${customerGroupId}`);
                        const code = rawCustomerGroupResponse.name;
                        rawCustomerGroupResponse = {code, name, visibility};
                    }
                    */
                }
            } catch (error) {
                console.log(`list on /orders/${id}/customer : error`, error);
            }
            return { ...order, products: products.filter(p => !!p), shippingAddresses, coupons, customer: rawCustomerGroupResponse };
        }));

        console.log('***********************');
        console.log('3');
        console.log('***********************');

        res.status(200).json(response/*.filter(order => order.status_id === 11)*/);
    } catch (error) {
        const { message, response } = error;
        console.log('list***: error', error);
        res.status(response?.status || 500).json({ message });
    }
}
