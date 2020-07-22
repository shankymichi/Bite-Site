// JavaScript source code
var mongoose = require("mongoose");
var commentSchema = new mongoose.Schema({


    text: String,

    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"

        },
        username: String 
    }
});
var comment = mongoose.model("comments", commentSchema); // comments - name of model , requires in campground Schema
module.exports = mongoose.model("comments", commentSchema);