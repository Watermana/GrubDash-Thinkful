const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");


/*
* middleware functions
*/

/**
 * Skips to next function if property name is valid, otherwise sends error to error handler
 * 
 * @param {string} propertyName | property name from request body
 */
const bodyDataHas = propertyName => {
    return (req, res, next) => {
      const { data = {} } = req.body;
      if (data[propertyName]) {
        return next();
      }
      next({ status: 400, message: `Order must include a ${propertyName}` });
    };
  }


/**
 * Takes in orderId from request url, checks it that order exists in orders array, if it does
 * then set local param to the order object, otherwise sends error to error handler
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @param {Object} | next function in express 
 */
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



/**
 * Checks that the dishes array in the order object is valid. If not send error to error handler
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @param {Object} | next function in express 
 */
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



/**
 * If the id is provided in the request body, checks if that id matches the orderId from the url.
 * If not sends error to error handler.
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @param {Object} | next function in express 
 */
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



/**
 * Checks that the order status is valid when updating order. If status is devlivered or an invalid status,
 * send error to error handler.
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @param {Object} | next function in express 
 */
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



/**
 * Checks to make sure status in the order object is pending when deleting orders,
 * if not send error to error handler.
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @param {Object} | next function in express 
 */
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

/*
* handler functions
*/


/**
 * sends list of all orders to client
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @returns {Object} | orders array 
 */
const list = (req, res) => {
    res.json({data: orders})
}


/**
 * Takes in new order from request body, assigns new ID, then updates orders array
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @returns {Object} | sends status 201 and newly created order to client 
 */
const create = (req, res) => {
    let {data} = req.body;
    data = {
        id: nextId(),
        ...data
    }
    orders.push(data);
    res.status(201).json({data})
}


/**
 * Sends specific order to client in JSON format
 *  
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @returns {Object} | sends order  
 * 
 */
const read = (req, res) => {
    res.json({data: res.locals.order})
}


/**
 * Updates order object to the new data provided
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @returns {Object} | sends status 200 and the updated order to client 
 */
const update = (req, res) => {
    const {data: {deliverTo, mobileNumber, status, dishes}} = req.body
    const order = res.locals.order;

    
    order.deliverTo = deliverTo;
    order.mobileNumber = mobileNumber;
    order.status = status;
    order.dishes = dishes;

    res.status(200).json({data: order})
}

/**
 * Finds the index of the order to be deleted, the splices it out and returns status 204
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @returns {Object} | sends status 204 to client 
 */

function destroy(req, res) {
    const { orderId } = req.params;
    const index = orders.findIndex((order) => order.id === Number(orderId));
    
    orders.splice(index, 1);
    
    res.sendStatus(204);
}

module.exports = {
    list,
    read: [orderExists, read],
    create: [
        bodyDataHas("deliverTo"),
        bodyDataHas("mobileNumber"),
        bodyDataHas("dishes"),
        dishesIsValid,
        create
    ],
    update: [
        orderExists,
        matchId,
        bodyDataHas("deliverTo"),
        bodyDataHas("mobileNumber"),
        bodyDataHas("dishes"),
        dishesIsValid,
        statusIsValid,
        update
    ],
    destroy: [orderExists, statusIsPending, destroy]
}