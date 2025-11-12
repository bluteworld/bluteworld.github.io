let scl;
let w, h;
let gw = 4;
let gh = 4;
let padding;
// let numImgs = 58
// let images = [];

// function preload() {
//   for(let i = 1; i <= numImgs; i++){
//     images.push(loadImage('../assets/b('+num+').jpg'));
//   }
// }

function setup(){
  createCanvas();
  colorMode(HSB, 1, 1, 1)
  windowResized();
}

let strokeFill = (s, f) => {
  (!s) ? noStroke() : stroke(...s);
  (!f) ? noFill() : fill(...f);
}

let pushPop = (f) => {push(); f(); pop();}

let screenToGrid = (x, y) => {
  return [
    ((x-(w/2))/scl)+gw/2,
    ((y-(h/2))/scl)+gh/2
  ];
}

let gridToScreen = (x, y) => {
  return [
    ((x-(gw/2))*scl)+w/2,
    ((y-(gh/2))*scl)+h/2
  ];
}

// let cell = (i, j) => {
//   rect(i, j, 1, 1);
//   images(images[])
// } 

const getRandomUniqueNumbers = (min, max, count) =>
  [...Array(max - min + 1).keys()]
    .map(i => i + min)
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

function draw(){
  background('#E0D3B6');
  drawMouse();
  drawBorder();

  pushPop(() => {
    translate(w/2, h/2);
    scale(scl);
    translate(-gw/2, -gh/2);
    strokeFill(['#494031']);
    strokeWeight(1/scl);

    let mouse = screenToGrid(...mousePos).map(i => floor(i));
    // let imgIdx = 
    for(let i = 0; i < gw; i++){
      for(let j = 0; j < gh; j++){
        pushPop(() => {
          if(mouse[0] == i && mouse[1] == j && mouseDown) fill('#bba983ff');
          rect(i, j, 1, 1);
          // cell(i, j)
        });
      }
    }
  });
}

function drawBorder(){
  pushPop(() => {
    rectMode(CENTER);
    strokeFill(['#494031']);
    strokeWeight(2.5);
    rect(w/2, h/2, w-padding*2, h-padding*2, 10);
  });
}

function drawMouse(){
  pushPop(() => {
    fill(0);
    if(mousePos[0] > 0){
      ellipse(mousePos[0], mousePos[1], 10);
    }
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  w = width;
  h = height;
  padding = min(w, h)*0.02;
  scl = min((w-padding*4)/gw, (h-padding*4)/gh);
}

let mouseDown = false;
let mousePos = [-1, -1];

onpointerdown = evt => {
  mouseDown = true;
  mousePos = [evt.clientX, evt.clientY];
}

onpointerup = evt => {
  mouseDown = false;
}

onpointermove = evt => {
  mousePos = [evt.clientX, evt.clientY];
}