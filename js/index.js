var c, can, ctx, currentImage;

$(window).load(function() {
    c = $("canvas")[0];
    can = $("canvas");
    ctx = document.getElementById("canvas").getContext("2d");

    setTimeout(function() {

    }, 100);

    window.addEventListener('resize', resizeCanvas, false);

    var socket;

    $(".login").click(function() {
        linkIO.connect("localhost:8080", $(".user").val());

        linkIO.onUsersInRoomChange(function(users) {
            var str = "Users: ";
            for(var i = 0; i<users.length; i++) {
                str += users[i].login + (i < users.length - 1 ? ", " : ".");
            }
            $(".users").html(str);
        });

        linkIO.on("graphical-ask", function(e) {
            e.Layer.Strokes.forEach(function(stroke) {
                for(var i = 0; i<stroke.Points.length - 1; i++) {
                    if(i == 0)
                        console.log(stroke.Points[i]);
                    drawLine(stroke.Points[i].X / can.width(),
                        stroke.Points[i].Y / can.height(),
                        stroke.Points[i+1].X / can.width(),
                        stroke.Points[i+1].Y / can.height(),
                        "black");
                }
            });
        });

        linkIO.on("test", function(e) {
            console.log(e);
        });

        linkIO.on("line", function(e) {
            drawLine(e.fromX, e.fromY, e.toX, e.toY, e.color);
        });

        linkIO.on("point", function(e) {
            drawPoint(e.x, e.y, e.color);
        });

        linkIO.on("image", function(e) {
            e.img = e.img;
            a = e.img;
            console.log("Received image: " + e.img.length);
            drawImage(e.img, e.x, e.y, e.w, e.h);
        });

        linkIO.on("clear", function(e) {
            ctx.beginPath();
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, can.width(), can.height());
        });

        linkIO.on("eventsPerSeconds", function(e) {
            $(".events").html(e);
        });

        setInterval(function() {
            linkIO.getLatency(function(l) {
                $(".latency").html(l);
            })
        }, 1000);
    });

    $(".join").click(function() {
        var g = $(".group").val();
        if(g == "") {
            linkIO.createRoom(function(id) {
                $(".group").val(id);
            });
        }
        else {
            linkIO.joinRoom(g, function(id, users) {
                $(".group").val(id);

                var str = "Users: ";
                for(var i = 0; i<users.length; i++) {
                    str += users[i].login + (i < users.length - 1 ? ", " : ".");
                }
                $(".users").html(str);
            });
        }
    });

    mouseDown = false;
    click = false;
    imageClick = false;
    imageDrag = false;
    var imgX, imgY;
    imageObject = undefined;
    canvasImageOject = undefined;
    waitLineTime = 10;
    lastLineTime = 0;
    $("canvas").mousedown(function(e) {
        lastEvent = e;
        mouseDown = true;
        click = true;

        if(imageClick && !imageDrag) {
            imageObject = new Image();
            imageObject.onload = function() {
                canvasImageOject = new Image();
                canvasImageOject.onload = function() {
                    imgX = e.offsetX;
                    imgY = e.offsetY;
                    imageDrag = true;
                };
                canvasImageOject.src = c.toDataURL();
            };
            imageObject.src = currentImage;
        }
    }).mousemove(function(e) {
        if(imageDrag) {
            ctx.fillStyle = "white";
            ctx.rect(0, 0, can.width(), can.height());
            ctx.fill();
            ctx.drawImage(canvasImageOject, 0, 0);
            ctx.drawImage(imageObject, imgX, imgY, e.offsetX - imgX, e.offsetY - imgY);
        }
        else if (mouseDown && !imageClick) {
            if(Date.now() - lastLineTime > waitLineTime) {
                linkIO.emit("line", {
                    fromX: (lastEvent.offsetX / can.width()) != 0 ? lastEvent.offsetX / can.width() : "0.0",
                    fromY: (lastEvent.offsetY / can.height()) != 0 ? lastEvent.offsetY / can.height() : "0.0",
                    toX: (e.offsetX / can.width()) != 0 ? e.offsetX / can.width() : "0.0",
                    toY: (e.offsetY / can.height()) != 0 ? e.offsetY / can.height() : "0.0",
                    color: $(".color").val()
                }, false);
                drawLine(lastEvent.offsetX / can.width(),
                    lastEvent.offsetY/ can.height(),
                    e.offsetX / can.width(),
                    e.offsetY / can.height(),
                    $(".color").val());

                lastEvent = e;
                lastLineTime = Date.now();
            }
        }
        click = false;
    }).mouseup(function(e) {
        mouseDown = false;
        if(imageDrag) {
            linkIO.emit("image", {
                img: imageObject.src,
                x: imgX / can.width(),
                y: imgY / can.height(),
                w: (e.offsetX - imgX) / can.width(),
                h : (e.offsetY - imgY) / can.height()
            }, false);

            imageClick = false;
            imageDrag = false;
        }
    }).mouseleave(function() {
        $("canvas").mouseup();
    }).click(function(e) {
        if(click && !imageClick) {
            linkIO.emit("point", {
                x: e.offsetX / can.width(),
                y: e.offsetY / can.height(),
                color: $(".color").val()
            }, false);
            drawPoint(e.offsetX / can.width(), e.offsetY / can.height(), $(".color").val());
        }
        click = false;
        imageClick = false;
    });

    c.addEventListener("touchstart", function(e) {
        lastEvent = e;
        mouseDown = true;
        click = true;

        if(imageClick && !imageDrag) {
            imageObject = new Image();
            imageObject.onload = function() {
                canvasImageOject = new Image();
                canvasImageOject.onload = function() {
                    imgX = e.touches[0].pageX - can.offset().left;
                    imgY = e.touches[0].pageY - can.offset().top;
                    imageDrag = true;
                };
                canvasImageOject.src = c.toDataURL();
            };
            imageObject.src = currentImage;
        }
    });
    lastX = 0, lastY = 0;
    c.addEventListener("touchmove", function(e) {
        e.preventDefault();
        if(imageDrag) {
            ctx.fillStyle = "white";
            ctx.rect(0, 0, can.width(), can.height());
            ctx.fill();
            ctx.drawImage(canvasImageOject, 0, 0);
            lastX = e.touches[0].pageX - can.offset().left - imgX;
            lastY = e.touches[0].pageY - can.offset().top - imgY;
            ctx.drawImage(imageObject,
                imgX,
                imgY,
                lastX,
                lastY);
        }
        else if (mouseDown && !imageClick) {
            linkIO.emit("line", {
                fromX: (lastEvent.touches[0].pageX - can.offset().left)  / can.width(),
                fromY: (lastEvent.touches[0].pageY - can.offset().top)  / can.height(),
                toX: (e.touches[0].pageX - can.offset().left)  / can.width(),
                toY: (e.touches[0].pageY - can.offset().top)  / can.height(),
                color: $(".color").val()
            }, true);

            lastEvent = e;
        }
    });
    c.addEventListener("touchend", function(e) {
        mouseDown = false;
        if(imageDrag) {
            linkIO.emit("image", {
                img: imageObject.src,
                x: imgX / can.width(),
                y: imgY / can.height(),
                w: lastX / can.width(),
                h : lastY / can.height()
            }, false);

            imageClick = false;
            imageDrag = false;
        }
    });

    $(".clear").click(function() {
        linkIO.emit("clear", {}, true);
    });

    $(".image").click(function() {
        $(".imgPicker").trigger("click");
        imageClick = true;
    });

    $(".imgPicker").change(function(){
        readImage(this, function(base64) {
            currentImage = base64;
        });
    });
});

function readImage(input, cb) {
    if ( input.files && input.files[0] ) {
        var FR= new FileReader();
        FR.onload = function(e) {
            console.log(e.target.result.length);
            cb(e.target.result);
        };
        FR.readAsDataURL( input.files[0] );
    }
    else
        imageClick = false;
}

function resizeCanvas() {
    can.attr("width", $(".canvasContainer").width() + "px");
    can.css("width", $(".canvasContainer").width() + "px");
}

function drawLine(x1, y1, x2, y2, color) {
    ctx.beginPath();
    ctx.moveTo(x1 * can.width(), y1 * can.height());
    ctx.lineTo(x2 * can.width(), y2 * can.height());
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
}

function drawPoint(x, y, color) {
    ctx.beginPath();
    ctx.arc(x * can.width(), y * can.height(), 4, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawImage(base64, x, y, w, h, cb) {
    var image = new Image();
    image.onload = function() {
        ctx.drawImage(image, x * can.width(), y* can.height(), w* can.width(), h* can.height());
        if(typeof cb != 'undefined')
            cb();
    };
    image.src = base64;
}