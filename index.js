var iconv = require('iconv-lite');
var fs = require('fs');
var encoding = require('encoding-japanese');
const { exit } = require('process');

var data00 = fs.readFileSync('adata00.dat');
var data01 = fs.readFileSync('adata01.dat');
var data02 = fs.readFileSync('adata02.dat');
var data03 = fs.readFileSync('adata03.dat');

var data00_u8 = new Uint8Array(data00);
var data01_u8 = new Uint8Array(data01);
var data02_u8 = new Uint8Array(data02);
var data03_u8 = new Uint8Array(data03);

var item_array = [];

const len_00 = 0xA8;
const len_01 = 0x20;
const len_02 = 0x40;
const len_03 = 0x58;
const num = parseInt(data01_u8.length / len_01);

console.log('num = ' + num);

for (var i = 0; i < num; i++) {
    var data = new Uint8Array(len_00 + len_01 + len_02 + len_03);
    var p_data00 = data00_u8.slice(i * len_00, (i + 1) * len_00);
    var p_data01 = data01_u8.slice(i * len_01, (i + 1) * len_01);
    var p_data02 = data02_u8.slice(i * len_02, (i + 1) * len_02);
    var p_data03 = data03_u8.slice(i * len_03, (i + 1) * len_03);
    pos = 0;
    p_data00.forEach(e => {
        data[pos] = e;
        pos++;
    });
    p_data01.forEach(e => {
        data[pos] = e;
        pos++;
    });
    p_data02.forEach(e => {
        data[pos] = e;
        pos++;
    });
    p_data03.forEach(e => {
        data[pos] = e;
        pos++;
    });
    var str = new TextDecoder("shift_jis").decode(p_data01.slice(0, p_data01.findIndex(v => v == 0)));
    fs.writeFileSync('out/' + str + '_data' + i + '.dat', data);
}

exit();

fs.readFile('adata00.dat', function(err, content) {
    if (err) {
        console.error(err);
    }
    var result = {
        bitmap: '',
        text: '',
        flags: []
    };
    //  バイト操作用のバイナリバッファを作成する
    var buf = new Buffer(content, 'binary');
    //  BMPファイルのヘッダは
    //  'B', 'M'の後ろ、3バイト目から7バイト目にファイルサイズが32bit整数(リトルエンディアン)で入っている
    var bitmapSize = buf.readUInt32LE(2);
    //  画像データのビットマップファイルとしての長さがわかったので
    //  データとビットマップを分離する
    var bitmap = buf.slice(0, bitmapSize - 1);
    //  結果セットにはとりあえずDataURI形式で保存する
    //  ※ただでさえデカくなりがちなBMPに実運用でこれはあまりお勧めしません
    result.bitmap = 'data:image/bmp;base64,' + bitmap.toString('base64');

    var dataBlock = buf.slice(bitmapSize, buf.length - 1);
    //  データブロック先頭の256バイトは何かしらの暗号化がなされた元Shift JISの文字列が入っている
    //  my_decrypt.decrypt()はその復号を行う
    //  SJISはそのままだとJavaScript内部で文字列としては取り扱えないので
    //  iconv-liteを使ってshift_jisからの変換をはかる
    result.text = iconv.decode(my_decrypt.decrypt(dataBlock.slice(0, 0xff)), 'shift_jis');
    //  データブロックの257バイト目には有効なフラグの数が16bit整数(リトルエンディアン)入っていて
    var flags = dataBlock.readUInt16LE(0x100);
    //  フラグは各1バイト
    for (var i = 0; i < flags; i++) {
        result.flags.push(dataBlock.readUInt8(0x102 + i));
    }
    //  終わり
    console.log(result);
});