function ByteArray () { this.bin = [] }

ByteArray.prototype.getData = function () {
  for(var v = '', l = this.bin.length, i = 0; i < l; i++) { v += chr[this.bin[i]] }
  return v
}

ByteArray.prototype.writeByte = function (val) { this.bin.push(val) }

ByteArray.prototype.writeUTFBytes = function(string){
  for(var l = string.length, i = 0; i < l; i++) {this.writeByte(string.charCodeAt(i)) }
}

ByteArray.prototype.writeBytes = function(array, offset, length){
  for(var l = length || array.length, i = offset||0; i < l; i++) { this.writeByte(array[i]) }
}

module.exports = ByteArray
