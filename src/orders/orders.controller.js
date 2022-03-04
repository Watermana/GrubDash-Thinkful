const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// middleware functions

const bodyDataHas = propertyName => {
    return (req, res, next) => {
      const { data = {} } = req.body;
      if (data[propertyName]) {
        return next();
      }
      next({ status: 400, message: `Order must include a ${propertyName}` });
    };
  }

const orderExists = (req, res, next) => {
    const {orderId} = req.params;
    const foundOrder = orders.find(order => order.id == orderId);
    if(!foundOrder) {
        return next({
            status: 404,
            message: `Order ID not found: ${orderId}`
        })
    } else {
        res.locals.order = foundOrder;
        return next();
    }
}

const dishesIsValid = (req, res, next) => {
    const { data: { dishes } = {} } = req.body;
    if (!Array.isArray(dishes) || dishes.length == 0) {
        return next({
            status: 400,
            message: "Order must include at least one dish"
        })
    }
    dishes.forEach((dish, index) => {
        if(typeof(dish.quantity) !== 'number' || !dish.quantity) {
            return next({
                status: 400,
                message: `Dish ${index} must have quantity this is an integer greater than 0`
            })
        }
    })
    return next();
}

const matchId = (req, res, next) => {
    const {data: {id} = {}} = req.body;
    const {orderId} = req.params;
    if(id && orderId !== id) {
        return next({
            status: 400,
            message: `Order id does not match route id. Order: ${id}, Route:${orderId}`
        })
    }
    return next();
}

const statusIsValid = (req, res, next) => {
    const {data: {status} = {} } = req.body;
    const validStatus = ['pending', 'preparing', 'out-for-delivery'];
    if(!status || !validStatus.includes(status)) {
        return next({
            status: 400,
            message: "Order must have a status of pending, preparing, out-for-delivery, delivered"
        })
    } else if (status === "delivered") {
        return next({
            status: 400,
            message: "A delivered order cannot be changed"
        })
    }
    return next();
}

const statusIsPending = (req, res, next) => {
    const order = res.locals.order;
    if(order.status !== 'pending') {
        return next({
            status: 400,
            message: 'An order cannot be deleted unless it is pending'
        })
    }
    return next();
}

//handler functions

const list = (req, res) => {
    res.json({data: orders})
}

const create = (req, res) => {
    let {data} = req.body;
    data = {
        id: nextId(),
        ...data
    }
    orders.push(data);
    res.status(201).json({data})
}

const read = (req, res) => {
    res.json({data: res.locals.order})
}

const update = (req, res) => {
    const {data: {deliverTo, mobileNumber, status, dishes}} = req.body
    const order = res.locals.order;

    
    order.deliverTo = deliverTo;
    order.mobileNumber = mobileNumber;
    order.status = status;
    order.dishes = dishes;

    res.status(200).json({data: order})
}

function destroy(req, res) {
    const { orderId } = req.params;
    const index = orders.findIndex((order) => order.id === Number(orderId));
    
    orders.splice(index, 1);
    
    res.sendStatus(204);
}

module.exports = {
    list,
    read: [orderExists, read],
    create: [bodyDataHas("deliverTo"), bodyDataHas("mobileNumber"), bodyDataHas("dishes"), dishesIsValid, create],
    update: [orderExists, matchId, bodyDataHas("deliverTo"), bodyDataHas("mobileNumber"), bodyDataHas("dishes"), dishesIsValid, statusIsValid, update],
    destroy: [orderExists, statusIsPending, destroy]
}