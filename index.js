var fs = require('fs');
const { exit } = require('process');
const type = require('./def');
const commander = require("commander");

commander
    .option('-i, --input [file]', 'help')
    .parse(process.argv);
console.log(commander.getOptionValue("input"));

var targets = ["anem", "ahelp", "adata00", "adata03"];
var targets = ["tekinem", "endata00"];

if(commander.getOptionValue("input")) {
    // output patch
    var json_file = commander.getOptionValue("input");
    var item_array = JSON.parse(fs.readFileSync(json_file));
    targets.forEach(t => {
        var buf = [];
        if(type[t].type == "binary") {
            item_array.forEach(e => {
                var def = type[t].def;
                var len = type[t].len;
                var obj = e[t];
                var res = new Uint8Array(len);
                for(const key in obj) {
                    const val = obj[key];
                    const found = def.find(e => {
                        return key == e.name
                        || key == generateKey(e.offset, e.mul ? e.mul : 1)
                    });
                    if(found) {
                        const offset = found.offset;
                        const mul = found.mul ? found.mul : 1;
                        var tmp = read32(res, offset);
                        write32(res, offset, tmp + val * mul);
                    }
                }
                buf.push(res);
            });
            fs.writeFileSync(t + '.dat', joinU8Array(buf));
        } else {
            //text
            item_array.forEach(e => {
                buf.push(e[t]);
            });
            fs.writeFileSync(t + '.txt', buf.join("\n"));
        }
    });
} else {
    // generate json
    var item_array = [];
    var set = {};
    var len = 0;
    targets.forEach(t => {
        var buf = [];
        if(type[t].type == "binary") {
            var file = fs.readFileSync(t + '.dat');
            var u8 = new Uint8Array(file);
            const num = parseInt(u8.length / type[t].len);
            for (var i = 0; i < num; i++) {
                var json = {};
                var p_data = u8.slice(i * type[t].len, (i + 1) * type[t].len);
                type[t].def.forEach(e => {
                    var max = e.max ? e.max : 0xFFFFFFFF;
                    var mul = e.mul ? e.mul : 1;
                    var v = (parseInt(u8ToNumber(p_data, e.offset) / mul)) % (max + 1);
                    var key = e.name == "?" ? generateKey(e.offset, mul) : e.name;
                    json[key] = v;
                });
                buf.push(json);
            }
        } else {
            var file = fs.readFileSync(t + '.txt');
            var lines = [];
            file.toString().split("\n").forEach(l => {
                lines.push(l);
                if(lines.length == type[t].line) {
                    buf.push(lines.join("\n"));
                    lines = [];
                }
            });
        }
        set[t] = buf;
        len = len > buf.length ? len : buf.length;
    });

    for(var i = 0; i < len; i++) {
        item_array[i] = {};
        targets.forEach(t => {
            item_array[i][t] = set[t][i];
        });
    }

    fs.writeFileSync(
        'out.json',
        JSON.stringify(item_array,undefined,4)
        );
}

exit();

function read32(u8, offset) {
    var val = 0;
    for(var i = 3; i >= 0; i--) {
        val = val << 8;
        val += u8[offset + i];
    }
    return val;
}

function write32(u8, offset, val) {
    for(var i = 0; i < 4; i++) {
        u8[offset + i] = val % 0x100;
        val = val >> 8;
    }
}

function generateKey(offset, mul) {
    return "Offset_" + offset.toString(16).padStart(2, '0') + '_' + mul;
}

function u8ToNumber(u8, start = 0, len = 4) {
    var p = 0;
    var res = 0;
    for(var i = start; i < start + len; i++) {
        res += u8[i] * (0x100 ** p);
        p++;
    }
    return res;
}

function joinU8Array(array = []) {
    var len = 0;
    var ptr = 0;
    array.forEach(e => {
        len += e.length;
    });
    var ret = new Uint8Array(len);

    array.forEach(e => {
        e.forEach(e => {
            ret[ptr] = e;
            ptr++;
        })
    });

    return ret;
}