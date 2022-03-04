const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");


// middelware functions


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
      next({ status: 400, message: `Dish must include a ${propertyName}` });
    };
  }


/**
 * Takes in dishId from request url, checks it that dish exists in dishes array, if it does
 * then set local param to the dish object, otherwise sends error to error handler
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @param {Object} | next function in express 
 */
const dishExists = (req, res, next) => {
    const {dishId} = req.params
    const foundDish = dishes.find(dish => dish.id == dishId)
    if(!foundDish) {
        return next({
            status: 404,
             message: `Dish ID not found: ${dishId}`
        })
    } else {
        res.locals.dish = foundDish;
        return next();
    }
} 


/**
 * Checks that the price value in the dish object is a number and greater that zero,
 * if not send error to error handler.
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @param {Object} | next function in express 
 */
const priceisValid = (req, res, next) => {
    const { data: { price } = {} } = req.body;
    if (typeof(price) !== 'number' || price <= 0) {
        return next({
            status: 400,
            message: "Dish must have a price that is an integer greater than zero"
        })
    }
    return next();
}



/**
 * If the id is provided in the request body, checks if that id matches the dishId from the url.
 * If not sends error to error handler.
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @param {Object} | next function in express 
 */
 const matchId = (req, res, next) => {
    const {data: {id} = {}} = req.body;
    const {dishId} = req.params;
    if(id && dishId !== id) {
        return next({
            status: 400,
            message: `Dish id does not match route id. Dish: ${id}, Route:${dishId}`
        })
    }
    return next();
}

/*
* handler functions
*/


/**
 * sends list of all dishes to client
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @returns {Object} | dishes array 
 */
const list = (req, res) => {
    res.json({data: dishes})
}



/**
 * Takes in new dish from request body, assigns new ID, then updates dishes array
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @returns {Object} | sends status 201 and newly created dish to client 
 */
const create = (req, res) => {
    let {data} = req.body
    data = {
        ...data,
        id: nextId()
    }
    dishes.push(data)
    res.status(201).json({data})
}



/**
 * Sends specific dish to client in JSON format
 *  
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @returns {Object} | sends dish  
 * 
 */
const read = (req, res) => {
    res.json({data: res.locals.dish})
}



/**
 * Updates dish object to the new data provided
 * 
 * @param {Object} req | the request body 
 * @param {Object} res | the response body
 * @returns {Object} | sends status 200 and the updated dish to client 
 */
const update = (req, res, next) => {
    const {data: {id, name, description, price, image_url}} = req.body;
    const dish = res.locals.dish;
    
    dish.name = name;
    dish.description = description;
    dish.price = price;
    dish.image_url = image_url

    res.status(200).json({data: dish})
}


module.exports = {
    list,
    read: [dishExists, read],
    create: [
        bodyDataHas("name"),
        bodyDataHas("description"),
        bodyDataHas("image_url"),
        bodyDataHas("image_url"),
        priceisValid,
        create
    ],
    update: [
        dishExists,
        matchId,
        bodyDataHas("name"),
        bodyDataHas("description"),
        bodyDataHas("image_url"),
        bodyDataHas("image_url"),
        priceisValid,
        update
    ]
}