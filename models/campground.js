// JavaScript source code
var mongoose = require("mongoose");
var campgroundSchema = new mongoose.Schema({


    name: String,

    image: String,
    description: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"

        },
        username: String
    },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "comments" //name of the model
        }
    ]


});
var campg = mongoose.model("campg", campgroundSchema);
module.exports = campg;
