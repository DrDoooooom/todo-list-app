//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Mongoose connection established
mongoose.connect(process.env.MONGO_DEV_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
}).then(() => {
    console.log('Mongoose is connected');
}).catch((err) => {
    console.log(err);
});


const dbConnection = mongoose.connection;
dbConnection.on("error", (err) => console.log(`Connection error ${err}`));
dbConnection.once("open", () => console.log("Connected to DB!"));

// Schema for the ToDo List
const itemSchema = new mongoose.Schema({
    name: String
});

// Collection created for the items 
const Item = mongoose.model("Item", itemSchema);

// Create default items document
const item1 = new Item({
    name: "Welcome to your ToDo List"
});

const item2 = new Item({
    name: "Hit + to add a new task"
});

const item3 = new Item({
    name: "<-- Checked this box to delete the task"
});

// Default array for storing default list items
const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
    name: String,
    items: [itemSchema]
});

const List = new mongoose.model("List", listSchema);

app.get("/", (req, res) => {
    // Finding items from collection
    Item.find({}, function(err, result) {
        // console.log(result);
        res.render("list", {
            listTitle: "Main",
            newListItems: result
        });
    });
});


app.get("/about", (req, res) => {
    res.render("about", {
        listTitle: "About",
        newListItems: []
    });
});

app.get("/:list", (req, res) => {
    const listName = _.lowerCase(req.params.list);

    List.findOne({ name: listName }, async (err, itemFound) => {
        if (!err) {
            if (!itemFound) {
                // Create new list if not previously
                const list = await new List({
                    name: listName,
                    items: defaultItems
                });

                await list.save();
            }
            // render the list
            await res.render("list", {
                listTitle: _.capitalize(itemFound.name),
                newListItems: itemFound.items
            });
        } else {
            console.log(err)
        }
    });

});

app.post("/add", (req, res) => {
    const { list, newItem } = req.body;
    if (newItem === "") {
        res.redirect('/')
    } else {
        const itemName = new Item({
            name: newItem
        });

        if (list === "Main") {
            itemName.save();
            res.redirect("/");
        } else {
            List.findOne({ name: _.lowerCase(list) }, (err, foundList) => {
                if (!foundList) {
                    // Create new list if not previously
                    const list = new List({
                        name: listName,
                        items: defaultItems
                    });

                    list.save();
                    res.redirect("/" + listName);
                } else {
                    foundList.items.push(itemName);
                    foundList.save();
                    res.redirect("/" + list);
                }
            });
        }
    }


});

app.post("/delete", function(req, res) {
    const { checkbox, listName } = req.body;

    if (listName === "Main") {
        Item.findByIdAndRemove(checkbox, err => {
            if (!err) {
                // console.log("Successfully deleted checked item");
                res.redirect("/");
            }
        });
    } else {
        List.findOneAndUpdate({ name: _.lowerCase(listName) }, { $pull: { items: { _id: checkbox } } }, (err, foundList) => {
            if (!err) {
                // console.log("Successfully deleted checked item");
                res.redirect("/" + listName);
            }
        });
    }

});


let port = process.env.PORT;
if (port == null || port === "") {
    port = 3000;
}

app.listen(port, () => {
    console.log(`Server started successfully on port ${port}`);
});