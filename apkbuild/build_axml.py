#!/usr/bin/env python3
"""Build a minimal binary AndroidManifest.xml (AXML) for Fusion.

Declares a single Activity (com.fusion.app.MainActivity) as the launcher.
"""
import struct

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

# string pool (UTF8)
strings = [
    "android",                                # 0
    "http://schemas.android.com/apk/res/android",  # 1
    "manifest",                               # 2
    "package",                                # 3
    "versionCode",                            # 4
    "versionName",                            # 5
    "application",                            # 6
    "activity",                               # 7
    "name",                                   # 8
    "com.fusion.app.MainActivity",            # 9
    "intent-filter",                          # 10
    "action",                                 # 11
    "android.intent.action.MAIN",             # 12
    "category",                               # 13
    "android.intent.category.LAUNCHER",       # 14
    "label",                                  # 15
    "Fusion",                                 # 16
    "com.fusion.app",                         # 17
    "1.7",                                    # 18
    "exported",                               # 19
    "uses-sdk",                               # 20
    "minSdkVersion",                          # 21
    "targetSdkVersion",                       # 22
]

# resource map: resource id per string index
res_map = [0] * len(strings)
res_map[4] = 0x0101021b  # versionCode
res_map[5] = 0x0101021c  # versionName
res_map[8] = 0x01010003  # name
res_map[15] = 0x01010001  # label
res_map[19] = 0x01010028  # exported
res_map[21] = 0x0101020c  # minSdkVersion
res_map[22] = 0x01010270  # targetSdkVersion

TYPE_STRING = 0x03
TYPE_INT_DEC = 0x10
TYPE_BOOLEAN = 0x12
NO_INDEX = 0xFFFFFFFF

def res_value(dtype, data):
    return struct.pack("<HBB I".replace(" ", ""), 8, 0, dtype, data)

def attr(ns, name, dtype, data, raw):
    # raw: string pool index if string type else NO_INDEX
    return struct.pack("<III", ns, name, raw) + res_value(dtype, data)

def chunk_header(ctype, size):
    return struct.pack("<HHI", ctype, 8, size)

def build_string_pool(strs):
    # encode each string: uleb16len, uleb bytelen, bytes
    data = b""
    offsets = []
    for s in strs:
        offsets.append(len(data))
        utf16len = len(s.encode("utf-16-be")) // 2
        raw = s.encode("utf-8")
        data += uleb128(utf16len) + uleb128(len(raw)) + raw + b"\x00"  # null terminator
        # pad each to 4-byte boundary
        while len(data) % 4:
            data += b"\x00"
    flags = 0x00000100  # UTF8_FLAG
    header_size = 28  # 8 (ResChunk_header) + 20 (pool fields)
    stringCount = len(strs)
    styleCount = 0
    strings_start = header_size + stringCount*4 + styleCount*4
    chunk_size = strings_start + len(data)
    pool = struct.pack("<HHI", 0x0001, header_size, chunk_size)
    pool += struct.pack("<IIII", stringCount, styleCount, flags, strings_start)
    pool += struct.pack("<I", 0)  # styles_start
    for o in offsets:
        pool += struct.pack("<I", o)
    pool += data
    return pool

def build_resource_map():
    body = b"".join(struct.pack("<I", r) for r in res_map)
    size = 8 + len(body)
    return struct.pack("<HHI", 0x0180, 8, size) + body

def build():
    pool = build_string_pool(strings)
    rmap = build_resource_map()

    # Each node: ResChunk_header(8) + lineNumber(4) + comment(4) + body
    def node_header(ctype, size):
        return struct.pack("<HHI", ctype, 16, size)

    # namespace start (type 0x0100): header(16) + prefix(4) + uri(4) = 24
    ns_start = node_header(0x0100, 24) + struct.pack("<II", 0, 0) + struct.pack("<II", 0, 1)
    # namespace end (type 0x0101)
    ns_end = node_header(0x0101, 24) + struct.pack("<II", 0, 0) + struct.pack("<II", 0, 1)

    def start_element(name_idx, attrs, ns=NO_INDEX):
        # header(8) + line(4) + comment(4) + ns(4) + name(4) + 6xuint16(12) + attrs
        size = 36 + len(attrs)*20
        h = struct.pack("<HHI", 0x0102, 16, size)
        h += struct.pack("<II", 0, 0)  # lineNumber, comment
        h += struct.pack("<I", ns)
        h += struct.pack("<I", name_idx)
        h += struct.pack("<HHHHHH", 0x14, 0x14, len(attrs), 0, 0, 0)
        for a in attrs:
            h += a
        return h

    def end_element(name_idx, ns=NO_INDEX):
        # header(16) + ns(4) + name(4) = 24 bytes
        return (node_header(0x0103, 24) + struct.pack("<II", 0, 0)
                + struct.pack("<II", ns, name_idx))

    # attributes
    attr_package = attr(NO_INDEX, 3, TYPE_STRING, 17, 17)
    attr_version_code = attr(1, 4, TYPE_INT_DEC, 17, NO_INDEX)
    attr_version_name = attr(1, 5, TYPE_STRING, 18, 18)
    attr_label = attr(1, 15, TYPE_STRING, 16, 16)
    attr_activity_name = attr(1, 8, TYPE_STRING, 9, 9)
    attr_exported = attr(1, 19, TYPE_BOOLEAN, 0xFFFFFFFF, NO_INDEX)
    attr_action = attr(1, 8, TYPE_STRING, 12, 12)
    attr_category = attr(1, 8, TYPE_STRING, 14, 14)
    attr_min_sdk = attr(1, 21, TYPE_INT_DEC, 24, NO_INDEX)
    attr_target_sdk = attr(1, 22, TYPE_INT_DEC, 33, NO_INDEX)

    out = b""
    # root chunk header (RES_XML_TYPE 0x0003) -- headerSize 8
    root_header_size = 8
    body = pool + rmap + ns_start
    body += start_element(2, [attr_package, attr_version_code, attr_version_name])  # manifest
    body += start_element(20, [attr_min_sdk, attr_target_sdk])  # uses-sdk
    body += end_element(20)
    body += start_element(6, [attr_label])  # application
    body += start_element(7, [attr_activity_name, attr_exported])  # activity
    body += start_element(10, [])  # intent-filter
    body += start_element(11, [attr_action])  # action
    body += end_element(11)
    body += start_element(13, [attr_category])  # category
    body += end_element(13)
    body += end_element(10)
    body += end_element(7)
    body += end_element(6)
    body += end_element(2)
    body += ns_end

    total_size = root_header_size + len(body)
    root = struct.pack("<HHI", 0x0003, root_header_size, total_size)
    return root + body

if __name__ == "__main__":
    axml = build()
    with open("AndroidManifest.xml", "wb") as f:
        f.write(axml)
    print("AndroidManifest.xml bytes:", len(axml))
    print("header:", axml[:8].hex())
