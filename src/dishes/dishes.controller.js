const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");


// middelware functions

const bodyDataHas = propertyName => {
    return (req, res, next) => {
      const { data = {} } = req.body;
      if (data[propertyName]) {
        return next();
      }
      next({ status: 400, message: `Dish must include a ${propertyName}` });
    };
  }

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


// handler functions
const list = (req, res) => {
    res.json({data: dishes})
}

const create = (req, res) => {
    let {data} = req.body
    data = {
        ...data,
        id: nextId()
    }
    dishes.push(data)
    res.status(201).json({data})
}

const read = (req, res) => {
    res.json({data: res.locals.dish})
}

const update = (req, res, next) => {
    const {data: {id, name, description, price, image_url}} = req.body;
    const dish = res.locals.dish;
    const {dishId} = req.params;
    if(id && dishId !== id) {
        return next({
            status: 400,
            message: `Dish id does not match route id. Dish: ${id}, Route:${dishId}`
        })
    }
    
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
        bodyDataHas("name"),
        bodyDataHas("description"),
        bodyDataHas("image_url"),
        bodyDataHas("image_url"),
        priceisValid,
        update
    ]
}