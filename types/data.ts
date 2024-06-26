export interface FormData {
    description: string;
    isVisible: boolean;
    name: string;
    price: number;
    type: string;
}

export interface TableItem {
    id: number;
    name: string;
    price: number;
    stock: number;
}

export interface TableItemOrder {
    id: number;
    status: string;
    customerId: number;
    order: any;
    customerName: string;
    customerCode: number|string;
    date_created: string;
}

export interface ListItem extends FormData {
    id: number;
}

export interface StringKeyValue {
    [key: string]: string;
}
