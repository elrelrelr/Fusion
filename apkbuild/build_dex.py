#!/usr/bin/env python3
"""Generate classes.dex for a Fusion MainActivity that shows a Toast.

MainActivity extends Activity, overrides onCreate(Bundle):
    super.onCreate(bundle)
    Toast.makeText(this, "Fusion 1.7", LENGTH_SHORT).show()
"""
import struct, zlib

def uleb128(v):
    out = b""
    while True:
        b = v & 0x7F
        v >>= 7
        if v:
            out += bytes([b | 0x80])
        else:
            out += bytes([b])
            break
    return out

def align4(buf):
    while len(buf) % 4:
        buf += b"\x00"
    return buf

def build():
    # strings sorted by UTF-16
    strings = [
        "<init>",                        # 0
        "Fusion 1.7",                    # 1
        "I",                             # 2
        "Landroid/app/Activity;",        # 3
        "Landroid/content/Context;",     # 4
        "Landroid/os/Bundle;",           # 5
        "Landroid/widget/Toast;",        # 6
        "Lcom/fusion/app/MainActivity;", # 7
        "Ljava/lang/CharSequence;",      # 8
        "LLLI",                          # 9
        "V",                             # 10
        "VL",                            # 11
        "makeText",                      # 12
        "onCreate",                      # 13
        "show",                          # 14
    ]
    string_data = []
    for s in strings:
        u16 = len(s.encode("utf-16-be")) // 2
        raw = s.encode("utf-8")
        string_data.append(uleb128(u16) + uleb128(len(raw)) + raw)

    # types (descriptor str idx) sorted: int, Activity, Context, Bundle, Toast, MainActivity, CharSequence, void
    types = [2, 3, 4, 5, 6, 7, 8, 10]
    # proto list: (shorty_str_idx, return_type_idx, [param_type_idx,...])  sorted
    # proto0 = makeText (Toast, [Context,CharSequence,int])
    # proto1 = ()V
    # proto2 = (Bundle)V
    protos = [(9, 4, [2, 6, 0]), (10, 7, []), (11, 7, [3])]
    # methods (class_type_idx, proto_idx, name_str_idx) sorted
    # method0 Activity.<init>   class type1 proto1 name0
    # method1 Activity.onCreate class type1 proto2 name13
    # method2 Toast.makeText    class type4 proto0 name12
    # method3 Toast.show        class type4 proto1 name14
    methods = [(1, 1, 0), (1, 2, 13), (4, 0, 12), (4, 1, 14)]

    header_size = 0x70
    string_ids_off = header_size
    string_ids_size = len(strings)
    type_ids_off = string_ids_off + string_ids_size * 4
    type_ids_size = len(types)
    proto_ids_off = type_ids_off + type_ids_size * 4
    proto_ids_size = len(protos)
    field_ids_off = proto_ids_off + proto_ids_size * 12
    field_ids_size = 0
    method_ids_off = field_ids_off
    method_ids_size = len(methods)
    class_defs_off = method_ids_off + method_ids_size * 8
    class_defs_size = 1
    data_off = class_defs_off + class_defs_size * 32

    # ---- code ----
    # <init>: invoke-direct {v0}, method0 ; return-void
    init_insns = struct.pack("<HHH", 0x1070, 0, 0) + struct.pack("<H", 0x000E)
    init_code = struct.pack("<HHHHII", 1, 1, 1, 0, 0, len(init_insns) // 2) + init_insns

    # onCreate code
    create_insns = struct.pack("<HHH", 0x206F, 1, 0x0032)  # invoke-super {v2,v3}, m1
    create_insns += struct.pack("<HH", 0x001A, 1)           # const-string v0, str1
    create_insns += struct.pack("<H", 0x0112)               # const/4 v1, 0  (bytes: 12 01)
    create_insns += struct.pack("<HHH", 0x3071, 2, 0x0102)  # invoke-static {v2,v0,v1}, m2
    create_insns += struct.pack("<H", 0x000A)               # move-result-object v0
    create_insns += struct.pack("<HHH", 0x106E, 3, 0x0000)  # invoke-virtual {v0}, m3
    create_insns += struct.pack("<H", 0x000E)               # return-void
    create_code = struct.pack("<HHHHII", 4, 2, 3, 0, 0, len(create_insns) // 2) + create_insns

    # ---- data section ----
    data = b""
    # type_list for proto0 params [Context, CharSequence, int]
    param_off0 = data_off + len(data)
    data += struct.pack("<I", 3) + struct.pack("<III", 2, 6, 0)
    data = align4(data)
    # type_list for proto2 params [Bundle]
    param_off2 = data_off + len(data)
    data += struct.pack("<I", 1) + struct.pack("<I", 3)
    data = align4(data)

    string_data_offsets = []
    for sd in string_data:
        string_data_offsets.append(data_off + len(data))
        data += sd
        data = align4(data)

    init_code_off = data_off + len(data)
    data += init_code
    data = align4(data)
    create_code_off = data_off + len(data)
    data += create_code
    data = align4(data)

    class_data_off = data_off + len(data)
    cd = uleb128(0) + uleb128(0) + uleb128(1) + uleb128(1)
    cd += uleb128(0) + uleb128(0x10001) + uleb128(init_code_off)
    cd += uleb128(1) + uleb128(0x1) + uleb128(create_code_off)
    data += cd
    data = align4(data)

    map_off = data_off + len(data)
    map_entries = [
        (0x0000, 1, header_size),
        (0x0001, string_ids_size, string_ids_off),
        (0x0002, type_ids_size, type_ids_off),
        (0x0003, proto_ids_size, proto_ids_off),
        (0x0005, method_ids_size, method_ids_off),
        (0x0006, class_defs_size, class_defs_off),
        (0x2003, string_ids_size, string_data_offsets[0]),
        (0x2000, 2, param_off0),
        (0x2001, 1, class_data_off),
        (0x2002, 2, init_code_off),
        (0x1000, 1, map_off),
    ]
    map_bytes = struct.pack("<I", len(map_entries))
    for e, s, o in map_entries:
        map_bytes += struct.pack("<HHII", e, 0, s, o)
    data += map_bytes

    file_size = data_off + len(data)

    buf = b"dex\n035\0"
    buf += b"\x00" * 4
    buf += b"\x00" * 20
    buf += struct.pack("<I", file_size)
    buf += struct.pack("<I", header_size)
    buf += struct.pack("<I", 0x12345678)
    buf += struct.pack("<II", 0, 0)
    buf += struct.pack("<I", map_off)
    buf += struct.pack("<II", string_ids_size, string_ids_off)
    buf += struct.pack("<II", type_ids_size, type_ids_off)
    buf += struct.pack("<II", proto_ids_size, proto_ids_off)
    buf += struct.pack("<II", field_ids_size, field_ids_off)
    buf += struct.pack("<II", method_ids_size, method_ids_off)
    buf += struct.pack("<II", class_defs_size, class_defs_off)
    buf += struct.pack("<II", len(data), data_off)

    for o in string_data_offsets:
        buf += struct.pack("<I", o)
    for t in types:
        buf += struct.pack("<I", t)
    for shorty, ret, params in protos:
        po = param_off0 if len(params) == 3 else (param_off2 if params else 0)
        buf += struct.pack("<III", shorty, ret, po)
    for c, p, n in methods:
        buf += struct.pack("<HHI", c, p, n)
    # class_def MainActivity: class type5(MainActivity), super type1(Activity)
    buf += struct.pack("<IIIIIIII", 5, 0x0001, 1, 0, 0xFFFFFFFF, 0, class_data_off, 0)
    buf += data

    sig = hashlib.sha1(buf[32:]).digest()
    buf = buf[:12] + sig + buf[32:]
    ck = zlib.adler32(buf[12:]) & 0xFFFFFFFF
    buf = buf[:8] + struct.pack("<I", ck) + buf[12:]
    return buf

if __name__ == "__main__":
    import hashlib
    d = build()
    open("classes.dex", "wb").write(d)
    print("classes.dex bytes:", len(d))
