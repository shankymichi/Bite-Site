// JavaScript source code
//packages required for authentication are:
//npm install passport passport-local passport-local-mongoose express-sesssion --save
var express = require("express");
var app = express();
var request = require("request");
var bodyParser = require('body-parser');
var mongoose = require("mongoose");
const MongoClient = require('mongodb').MongoClient;
var methodoverride = require("method-override");
var campg = require("./models/campground");
var comment = require("./models/comments");
var user = require("./models/users");
var passport = require("passport");
var localstrategy = require("passport-local");
var flash = require("connect-flash");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodoverride("_method"));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(flash());

mongoose.connect(process.env.DB_URI || "mongodb://localhost/yelp_camp");
app.use(express.static(__dirname + '/views'));
app.use(express.static(__dirname + '/views/partials'));
app.use(express.static(__dirname + '/partials'));

var port = process.env.PORT || 3000;

//passport configuration
app.use(require("express-session")({
    secret: "this could be anything",
        resave : false,
        saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localstrategy(user.authenticate()));  //user.authenticate
passport.serializeUser(user.serializeUser());      //and these two are  - the one that
passport.deserializeUser(user.deserializeUser());     //comes with passportlocalmongoose


// to automatically pass current user to all routes
app.use(function (req, res, next) {
    res.locals.currentuser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

//checking user to be logged in function
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "Please LogIn first.");
    res.redirect("/login");
}


//checking user to own the camp in function
function checkownership(req, res, next) {
    if (req.isAuthenticated()) {

        campg.findById(req.params.id, function (err, foundcamp) {

            if (err) {
                req.flash("error", "Post not found");
                console.log("error in editing this id");
                res.redirect("back");

            }

            else {
                //foundcamp.author.id    is an mongoose object & req.user._id is a string
                //so we cant compare them using ===
                if (foundcamp.author.id.equals(req.user._id)) {
                    next();
                }
            }

        });
    }
    else {
        req.flash("error", "You don't have permission to do that");
       // res.send("YOU DON'T HAVE PERMISSION TO DO THAT ONLY THE AUTHOR OF THE CAMPGROUND IS PERMITTED");
        res.redirect("back");
    }

}
//checking user to own the comment in function
function checkcommentownership(req, res, next) {
    if (req.isAuthenticated()) {

        comment.findById(req.params.comment_id, function (err, foundcomment) {

            if (err) {
                req.flash("error", "Comment not found");
                console.log("error in editing this id");
                res.redirect("back");
            }
            else {

                if (foundcomment.author.id.equals(req.user._id)) {
                    next();
                }
            }

        });
    }
    else {
        req.flash("error", "You don't have permission to do that");
     res.redirect("back");
    }

}


//landing page
app.get("/", function (req, res) {

    res.render("frontpage");
});

 //grounds route
app.get("/posts", function (req, res) {
   campg.find({}, function (err, campgrounds) {

        if (err) {
            console.log("error in finding");

        } else {
            res.render("grounds", { campgrounds: campgrounds , currentuser : req.user});}

    });

});

//posting grounds route
app.post("/posts",isLoggedIn, function (_req, res) {

      campg.create(_req.body.groundp, function (err, newcamp) {
          if (err) {
              console.log("error in yelpacamp");
              req.flash("error", "Post coundn't be created.");
            }
          else {
              newcamp.author.id = _req.user._id;
              newcamp.author.username = _req.user.username;
              newcamp.save();
             res.redirect("/posts");
          }

              });

    });


//adding new ground route
    app.get("/posts/new",isLoggedIn, function (_req, res) {


        res.render("newcamp");
    });


//displaying camp by id
    app.get("/posts/:id", function (req, res) {

       campg.findById(req.params.id).populate("comments").exec(function (err, foundcamp) {

            if (err) {
                console.log("error" + err);
                req.flash("error", "Post coundn't be found.");
                res.redirect("/posts");
            }
            else {
               res.render("show", { campground: foundcamp });
            }

        })


    });


//editing campground
app.get("/posts/:id/edit", checkownership, function (req, res) {

    campg.findById(req.params.id, function (err, foundcamp) {
        if (err) {
            console.log("error in displaying more of this id");
            req.flash("error", "Post coundn't be updated.");
            res.redirect("/posts");
        }

        else {
            res.render("editcamp", { fcamp: foundcamp });
        }
    });

});

//updating camp - overriden post method to put
app.put("/posts/:id/", checkownership,  function (req, res) {


    campg.findByIdAndUpdate(
        req.params.id, req.body.groundp, function (err, foundcamp) {

            if (err) {
                console.log("error in displaying more of this id");
                req.flash("error", "Post coundn't be updated.");
                res.redirect("/posts");
            }

            else {
                res.redirect("/posts/" + req.params.id);
            }
        });


});

//deleting camp overriden post method to delete
app.delete("/posts/:id", checkownership, function (req, res) {



        campg.findByIdAndRemove(req.params.id, function (err) {

            if (err) {
                console.log("error in deleting this id");
                req.flash("error", "Post coundn't be deleted.");
                res.redirect("back");
            }

            else {
                res.redirect("/posts");
            }
        });

})





//comments routes
app.get("/posts/:id/comments/new", isLoggedIn, function (req, res) {

    campg.findById(req.params.id, function (err, foundcamp) {

        if (err) {
            console.log("error" + err);
            req.flash("error", "Comment coundn't be created.");
            res.redirect("/posts");
        }
        else {
           res.render("newcomment", { campground: foundcamp });
        }

    })

});

//post route for  comments
app.post("/posts/:id/comments", isLoggedIn, function (_req, res) {
 campg.findById(_req.params.id, function (err, campground) {
        if (err) {
            console.log("error in finding for comment" + err);
        }
        else {
            comment.create(_req.body.groundcomment, function (err, newcomment) {
                if (err) {
                    req.flash("error", "Comment coundn't be created.");
                    console.log("error in post " + newcomments);
                }
                else {

                    newcomment.author.id = _req.user._id;
                    newcomment.author.username = _req.user.username;
                    newcomment.save();
                    campground.comments.push(newcomment);
                    campground.save();
                    //  res.redirect("/grounds/:id"); -- id not available
                    res.redirect("/posts/" + campground._id);
                }

            });
        }
    })
});









//comments edit , update & destroy


app.get("/posts/:id/comments/:comment_id/edit", checkcommentownership, function (req, res) {

    comment.findById(req.params.comment_id, function (err, foundcomment) {
        res.render("editcomment", { campground_id : req.params.id ,fcomment: foundcomment });
    });

});


app.put("/posts/:id/comments/:comment_id", checkcommentownership, function (req, res) {


    comment.findByIdAndUpdate(
        req.params.comment_id, req.body.groundcomment, function (err, foundcomment) {

            if (err) {
                console.log("error in displaying comment of this id");
                req.flash("error", "Comment coundn't be updated.");
                res.redirect("back");
            }

            else {
                res.redirect("/posts/" + req.params.id);
            }
        });


});


app.delete("/posts/:id/comments/:comment_id", checkcommentownership, function (req, res) {



    comment.findByIdAndRemove(req.params.comment_id, function (err) {

        if (err) {
            console.log("error in deleting this id");
            req.flash("error", "Comment coundn't be deleted.");
            res.redirect("back");
        }

        else {
            res.redirect("/posts/"+ req.params.id);
        }
    });

})




//show register form
app.get("/register", function (req, res) {

    res.render("register");
});



//handle sign up
app.post("/register", function (req, res) {

    var newuser = new user({ username: req.body.username });
    user.register(newuser, req.body.password, function (err, user) {
        if (err) {
            console.log("error" + err);
            req.flash("error", err.message);
             res.redirect("register");
        }
        else {
            passport.authenticate("local")(req, res, function () {

                req.flash("success", "Signed Up Successfully - " + user.username);
                res.redirect("/posts");
            });

        }
    });
});



//show login form
app.get("/login", function (req, res) {

    res.render("login");

});


app.post("/login", passport.authenticate("local", {
    successRedirect: "/posts", failureRedirect: "/login"
}), function (req, res) {
    });

app.get("/logout", function (req, res) {
    req.logout();
    req.flash("success", "Logged You Out!!");
    res.redirect("/posts");

});




    app.get("*", function (req, res) {
        res.send("sorry!!!not accessible");


    });

    app.listen(port, function () {


        console.log("executed foodie");
    });
