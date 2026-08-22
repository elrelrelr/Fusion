#!/usr/bin/env python3
import struct, sys

def uleb(d, off):
    r = 0; s = 0
    while True:
        b = d[off]; off += 1; r |= (b & 0x7f) << s
        if not b & 0x80: break
        s += 7
    return r, off

def main(path):
    d = open(path, "rb").read()
    pool_abs = 8
    psz = struct.unpack_from("<I", d, pool_abs + 4)[0]
    cnt, sc, flags, ss, st = struct.unpack_from("<IIIII", d, pool_abs + 8)
    so = [struct.unpack_from("<I", d, pool_abs + 28 + i * 4)[0] for i in range(cnt)]
    strs = []
    for o in so:
        a = pool_abs + ss + o; n, a = uleb(d, a); bl, a = uleb(d, a)
        strs.append(d[a:a + bl].decode())
    print("strings:", strs)

    off = pool_abs + psz
    mt, mhs, msz = struct.unpack_from("<HHI", d, off)
    print("resource map chunk", hex(mt), "size", msz)
    off += msz

    idx = 0
    while off < len(d):
        t2, hs2, sz2 = struct.unpack_from("<HHI", d, off)
        if t2 == 0x0102:
            ns, name = struct.unpack_from("<II", d, off + 16)
            astart, asize, acount = struct.unpack_from("<HHH", d, off + 24)
            print("START", strs[name], "attrs", acount)
            base = off + 16 + astart
            for k in range(acount):
                ans, aname, araw = struct.unpack_from("<III", d, base + k * 20)
                vs, v0, vdtype, vdata = struct.unpack_from("<HBBI", d, base + k * 20 + 12)
                nsstr = strs[ans] if ans != 0xFFFFFFFF else "NO_NS"
                an = strs[aname] if aname != 0xFFFFFFFF else "?"
                val = strs[vdata] if vdtype == 3 else hex(vdata)
                print("    attr", nsstr + ":" + an, "dtype", hex(vdtype), "val", val)
        elif t2 == 0x0103:
            ns, name = struct.unpack_from("<II", d, off + 16)
            print("END", strs[name])
        elif t2 in (0x0100, 0x0101):
            p, u = struct.unpack_from("<II", d, off + 16)
            print("NS", strs[p], "=", strs[u])
        else:
            print("UNKNOWN chunk", hex(t2), "size", sz2)
        if sz2 <= 0 or sz2 > len(d):
            print("BAD SIZE", sz2); break
        off += sz2; idx += 1
        if idx > 40:
            print("too many"); break
    print("AXML parse done, file size", len(d))

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "AndroidManifest.xml")
