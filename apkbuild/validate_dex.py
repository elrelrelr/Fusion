#!/usr/bin/env python3
import struct, zlib, hashlib, sys

def uleb(d, off):
    r = 0; s = 0
    while True:
        b = d[off]; off += 1; r |= (b & 0x7f) << s
        if not b & 0x80: break
        s += 7
    return r, off

def main(path="classes.dex"):
    d = open(path, "rb").read()
    assert d[:8] == b"dex\n035\0", "magic"
    fs = struct.unpack_from("<I", d, 32)[0]
    assert fs == len(d), (fs, len(d))
    stored = struct.unpack_from("<I", d, 8)[0]
    calc = zlib.adler32(d[12:]) & 0xFFFFFFFF
    assert stored == calc, "checksum"
    assert d[12:32] == hashlib.sha1(d[32:]).digest(), "sha1sig"
    print("header/checksum/signature OK, size", len(d))

    ssz = struct.unpack_from("<I", d, 56)[0]; sio = struct.unpack_from("<I", d, 60)[0]
    offs = [struct.unpack_from("<I", d, sio + i * 4)[0] for i in range(ssz)]
    strs = []
    for o in offs:
        n, a = uleb(d, o); bl, a = uleb(d, a)
        strs.append(d[a:a + bl].decode())
    print("strings:", strs)

    tsz = struct.unpack_from("<I", d, 64)[0]; tio = struct.unpack_from("<I", d, 68)[0]
    types = [struct.unpack_from("<I", d, tio + i * 4)[0] for i in range(tsz)]
    print("types:", [strs[t] for t in types])

    psz = struct.unpack_from("<I", d, 72)[0]; pio = struct.unpack_from("<I", d, 76)[0]
    for i in range(psz):
        shorty, ret, po = struct.unpack_from("<III", d, pio + i * 12)
        params = []
        if po:
            pn = struct.unpack_from("<I", d, po)[0]
            for j in range(pn):
                params.append(struct.unpack_from("<I", d, po + 4 + j * 4)[0])
        print("proto", i, strs[shorty], "ret", strs[types[ret]],
              "params", [strs[types[p]] for p in params])

    msz = struct.unpack_from("<I", d, 88)[0]; mio = struct.unpack_from("<I", d, 92)[0]
    for i in range(msz):
        c, p, n = struct.unpack_from("<HHI", d, mio + i * 8)
        print("method", i, strs[types[c]], strs[n], "proto", p)

    csz = struct.unpack_from("<I", d, 96)[0]; cio = struct.unpack_from("<I", d, 100)[0]
    for i in range(csz):
        ci, acc, sup, io, sf, ano, cdo2, svo = struct.unpack_from("<IIIIIIII", d, cio + i * 32)
        print("class", strs[types[ci]], "super", strs[types[sup]], "access", hex(acc))
        o = cdo2
        sf_, off = uleb(d, o); inf_, off = uleb(d, off)
        dm, off = uleb(d, off); vm, off = uleb(d, off)
        prev = 0
        for _ in range(dm):
            di, off = uleb(d, off); af, off = uleb(d, off); co, off = uleb(d, off)
            prev += di
            print("  direct m", prev, "code_off", co)
        for _ in range(vm):
            di, off = uleb(d, off); af, off = uleb(d, off); co, off = uleb(d, off)
            prev += di
            regs, ins, outs, tr, dbg, isize = struct.unpack_from("<HHHHHH", d, co)
            print("  virtual m", prev, "code_off", co, "regs", regs, "ins", ins, "outs", outs)
            print("    insns:", d[co + 16:co + 16 + isize * 2].hex())
    print("DEX VALIDATION OK")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "classes.dex")
