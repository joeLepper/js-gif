/*
 * this code is ported from
 * jsgif for use with commonjs / browserify / node
 * jsgif itself was itself ported from as3gif
 * which was based on a java implementation
 * I think that the Java version was written by King Solomon
 *
 */

var LZWEncoder = require('./lzw-encoder')
var NeuQuant = require('./neuquant')

module.exports = function () {
  for(var i = 0, chr = {}; i < 256; i++) { chr[i] = String.fromCharCode(i) }

  var width
  var height
  var transparent = null
  var transIndex
  var repeat = -1
  var delay = 0
  var started = false
  var out
  var image
  var pixels
  var indexedPixels
  var colorDepth
  var colorTab
  var usedEntry = new Array
  var palSize = 7
  var dispose = -1
  var closeStream = false
  var firstFrame = true
  var sizeSet = false
  var sample = 10
  var comment = 'Generated by jsgif (https://github.com/antimatter15/jsgif/)'

  return {
    setDelay: setDelay,
    setDispose: setDispose,
    setRepeat: setRepeat,
    setTransparent: setTransparent,
    setComment: setComment,
    addFrame: addFrame,
    finish: finish,
    setFrameRate: setFrameRate,
    setQuality: setQuality,
    setSize: setSize,
    start: start,
    cont: cont,
    stream: stream,
    setProperties,
    encode64: require('./b64')
  }

  function setDelay (ms) { delay = Math.round(ms / 10) }
  function setDispose (code) { if (code >= 0) dispose = code }
  function setRepeat (iter) { if (iter >= 0) repeat = iter }
  function setTransparent (c) { transparent = c }
  function setComment (c) { comment = c }
  function addFrame (im, is_imageData) {
    if ((im === null) || !started || out === null) {
      throw new Error ("Please call start method before calling addFrame")
    }
    var ok = true

    try {
      if(!is_imageData) {
        image = im.getImageData(0,0, im.canvas.width, im.canvasheight).data
        if (!sizeSet) etSize(im.canvas.width, im.canvas.height)
      } else image = im
      getImagePixels()
      analyzePixels()

      if (firstFrame) {
        writeLSD()     // logical screen descriptior
        writePalette() // global color table
        if (repeat >= 0) writeNetscapeExt()
      }

      writeGraphicCtrlExt() // write graphic control extension
      if (comment !== '') writeCommentExt() // write comment extension
      writeImageDesc()
      if (!firstFrame) writePalette()
      writePixels()
      firstFrame = false
    } catch (e) { ok = false }
    return ok
  }
  function finish () {
    if (!started) return false
    var ok = true
    started = false
    try { out.writeByte(0x3b) }
    catch (e) { ok = false }
    return ok
  }
  function reset () {
    transIndex = 0
    image = null
    pixels = null
    indexedPixels = null
    colorTab = null
    closeStream = false
    firstFrame = true
  }
  function setFrameRate (fps) {
    if (fps != 0xf) delay = Math.round(100/fps)
  }
  function setQuality (quality) {
    if (quality < 1) quality = 1
    sample = quality
  }
  function setSize (w, h) {
    if (started && !firstFrame) return
    width = w
    height = h
    if (width < 1)width = 320
    if (height < 1)height = 240
    sizeSet = true
  }
  function start ()/ {
    reset()
    var ok = true
    closeStream = false
    out = new ByteArray
    try { out.writeUTFBytes('GIF89a') }
    catch (err) { ok = false }
    started = ok
    return started
  }

  function cont () {
    reset()
    var ok  = true
    closeStream = false
    out = new ByteArray
    started = ok
    return started
  }
  function analyzePixels () {
    var len = pixels.length
    var nPix = len / 3
    indexedPixels = []
    var nq = new NeuQuant(pixels, len, sample)
    colorTab = nq.process() // create reduced palette
    var k = 0
    for (var j = 0; j < nPix; j++) {
      var index = nq.map(pixels[k++] & 0xff, pixels[k++] & 0xff, pixels[k++] & 0xff)
      usedEntry[index] = true
      indexedPixels[j] = index
    }
    pixels = null
    colorDepth = 8
    palSize = 7
    if (transparent != null) transIndex = findClosest(transparent)
  }
  function findClosest (c) {
    if (colorTab == null) return -1
    var r = (c & 0xFF0000) >> 16
    var g = (c & 0x00FF00) >> 8
    var b = (c & 0x0000FF)
    var minpos = 0
    var dmin = 256 * 256 * 256
    var len = colorTab.length

    for (var i = 0; i < len;) {
      var dr = r - (colorTab[i++] & 0xff)
      var dg = g - (colorTab[i++] & 0xff)
      var db = b - (colorTab[i] & 0xff)
      var d = dr * dr + dg * dg + db * db
      var index = i / 3
      if (usedEntry[index] && (d < dmin)) {
        dmin = d
        minpos = index
      }
      i++
    }
    return minpos
  }
  function getImagePixels () {
    var w = width
    var h = height
    pixels = []
    var data = image
    var count = 0

    for ( var i = 0; i < h; i++ ) {
      for (var j = 0; j < w; j++ ) {
          var b = (i * w * 4) + j * 4
          pixels[count++] = data[b]
          pixels[count++] = data[b+1]
          pixels[count++] = data[b+2]
      }
    }
  }
  function writeGraphicCtrlExt () {
    out.writeByte(0x21) // extension introducer
    out.writeByte(0xf9) // GCE label
    out.writeByte(4) // data block size
    var transp
    var disp
    if (transparent == null) {
      transp = 0
      disp = 0 // dispose = no action
    } else {
      transp = 1
      disp = 2 // force clear if using transparent color
    }
    if (dispose >= 0) {
      disp = dispose & 7 // user override
    }
    disp <<= 2
    // packed fields
    out.writeByte(0 | // 1:3 reserved
        disp | // 4:6 disposal
        0 | // 7 user input - 0 = none
        transp) // 8 transparency flag

    WriteShort(delay) // delay x 1/100 sec
    out.writeByte(transIndex) // transparent color index
    out.writeByte(0) // block terminator
  }
  function writeCommentExt () {
    out.writeByte(0x21) // extension introducer
    out.writeByte(0xfe) // comment label
    out.writeByte(comment.length) // Block Size (s)
    out.writeUTFBytes(comment)
    out.writeByte(0) // block terminator
  }
  function writeImageDesc () {
    out.writeByte(0x2c) // image separator
    WriteShort(0) // image position x,y = 0,0
    WriteShort(0)
    WriteShort(width) // image size
    WriteShort(height)

    // packed fields
    if (firstFrame) {
      // no LCT - GCT is used for first (or only) frame
      out.writeByte(0)
    } else {
      // specify normal LCT
      out.writeByte(0x80 | // 1 local color table 1=yes
          0 | // 2 interlace - 0=no
          0 | // 3 sorted - 0=no
          0 | // 4-5 reserved
          palSize) // 6-8 size of color table
    }
  }
  function writeLSD () {
    // logical screen size
    WriteShort(width)
    WriteShort(height)
    // packed fields
    out.writeByte((0x80 | // 1 : global color table flag = 1 (gct used)
        0x70 | // 2-4 : color resolution = 7
        0x00 | // 5 : gct sort flag = 0
        palSize)) // 6-8 : gct size

    out.writeByte(0) // background color index
    out.writeByte(0) // pixel aspect ratio - assume 1:1
  }
  function writeNetscapeExt () {
    out.writeByte(0x21) // extension introducer
    out.writeByte(0xff) // app extension label
    out.writeByte(11)   // block size
    out.writeUTFBytes("NETSCAPE" + "2.0") // app id + auth code
    out.writeByte(3)    // sub-block size
    out.writeByte(1)    // loop sub-block id
    WriteShort(repeat)  // loop count (extra iterations, 0=repeat forever)
    out.writeByte(0)    // block terminator
  }
  function writePalette () {
    out.writeBytes(colorTab)
    var n = (3 * 256) - colorTab.length
    for (var i = 0; i < n; i++) out.writeByte(0)
  }
  function WriteShort (pValue) {
    out.writeByte(pValue & 0xFF)
    out.writeByte((pValue >> 8) & 0xFF)
  }
  function writePixels () {
    var myencoder = new LZWEncoder(width, height, indexedPixels, colorDepth)
    myencoder.encode(out)
  }
  function stream () { return out }
  function setProperties(has_start, is_first){
    started = has_start
    firstFrame = is_first
  }
}
