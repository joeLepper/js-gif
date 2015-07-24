js-gif
======

A CommonJS port of the JavaScript port of an AS3 port of a Java library for generating animated gifs from a series of frames.

Installation
------------

`$ npm install js-gif --save`

Usage
-----

```javascript
// require the encoding library
var Gif = require('js-gif')

// get a new instance of the encoder
var gif = new Gif()

// how many times to repeat (0 for forever, any other int to loop that much then stop)
gif.setRepeat(0)

// how often (in ms) should the gif advance to the next frame?
gif.setDelay(100)

// tell the gif that you're going to start giving it frames
gif.start()

// give the gif some frames, which are imageData (typically this will be a canvas's context)
gif.addFrame(ctx)

// but if it looks like [imageData](https://developer.mozilla.org/en-US/docs/Web/API/ImageData)
//pass true to the second arg and call it a day
gif.addFrame(img, true)

// call this as many times as you have frames
gif.finish()

// get the data out
var rawData = gif.stream().getData()

// and make a dataUrl that we can pass around
var dataUrl = 'data:image/gif;base64,'+ gif.encode64(rawData)
```
