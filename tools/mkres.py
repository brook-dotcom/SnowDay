#!/usr/bin/env python3
"""Write a COFF .syso holding an icon group + manifest, for the Go linker (amd64)."""
import struct, sys

def build(ico_path, manifest_path, out_path):
    ico = open(ico_path, 'rb').read()
    _, typ, count = struct.unpack_from('<HHH', ico, 0)
    assert typ == 1
    images, group_entries = [], []
    for i in range(count):
        w, h, colors, res, planes, bpp, size, off = struct.unpack_from('<BBBBHHII', ico, 6 + 16 * i)
        images.append(ico[off:off + size])
        group_entries.append((w, h, colors, res, planes, bpp, size, i + 1))
    group = struct.pack('<HHH', 0, 1, count) + b''.join(struct.pack('<BBBBHHIH', *e) for e in group_entries)
    manifest = open(manifest_path, 'rb').read()

    LANG = 0x0409
    # tree: type -> [(id, bytes)]
    tree = [(3, [(i + 1, img) for i, img in enumerate(images)]), (14, [(1, group)]), (24, [(1, manifest)])]

    # --- layout ---
    def dir_size(n): return 16 + 8 * n
    off = dir_size(len(tree))
    type_dirs = []
    for t, items in tree:
        type_dirs.append(off); off += dir_size(len(items))
    lang_dirs = []
    for t, items in tree:
        row = []
        for _ in items:
            row.append(off); off += dir_size(1)
        lang_dirs.append(row)
    data_entries = []
    for t, items in tree:
        row = []
        for _ in items:
            row.append(off); off += 16
        data_entries.append(row)
    raw = []
    for t, items in tree:
        row = []
        for _, b in items:
            off = (off + 7) & ~7
            row.append(off); off += len(b)
        raw.append(row)
    total = (off + 7) & ~7
    buf = bytearray(total)

    def put_dir(at, entries):
        struct.pack_into('<IIHHHH', buf, at, 0, 0, 0, 0, 0, len(entries))
        for k, (ident, target) in enumerate(entries):
            struct.pack_into('<II', buf, at + 16 + 8 * k, ident, target)

    put_dir(0, [(t, 0x80000000 | type_dirs[i]) for i, (t, _) in enumerate(tree)])
    relocs = []
    for i, (t, items) in enumerate(tree):
        put_dir(type_dirs[i], [(ident, 0x80000000 | lang_dirs[i][j]) for j, (ident, _) in enumerate(items)])
        for j, (ident, b) in enumerate(items):
            put_dir(lang_dirs[i][j], [(LANG, data_entries[i][j])])
            de = data_entries[i][j]
            struct.pack_into('<IIII', buf, de, raw[i][j], len(b), 0, 0)
            relocs.append(de)  # OffsetToData needs an ADDR32NB relocation
            buf[raw[i][j]:raw[i][j] + len(b)] = b

    # --- COFF object ---
    hdr_size, sec_size = 20, 40
    raw_ptr = hdr_size + sec_size
    reloc_ptr = raw_ptr + len(buf)
    sym_ptr = reloc_ptr + 10 * len(relocs)
    out = bytearray()
    out += struct.pack('<HHIIIHH', 0x8664, 1, 0, sym_ptr, 1, 0, 0)
    out += struct.pack('<8sIIIIIIHHI', b'.rsrc', 0, 0, len(buf), raw_ptr, reloc_ptr, 0, len(relocs), 0, 0x40000040)
    out += buf
    for r in relocs:
        out += struct.pack('<IIH', r, 0, 3)  # IMAGE_REL_AMD64_ADDR32NB against symbol 0
    out += struct.pack('<8sIhHBB', b'.rsrc', 0, 1, 0, 3, 0)
    out += struct.pack('<I', 4)
    open(out_path, 'wb').write(out)
    print('wrote', out_path, len(out), 'bytes;', count, 'icon images')

if __name__ == '__main__':
    build(*sys.argv[1:4])
