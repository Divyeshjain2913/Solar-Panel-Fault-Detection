import os
from collections import defaultdict

stats = defaultdict(lambda: {'total': 0, 'readable': 0, 'cloud_only': 0})
for root, dirs, files in os.walk('data'):
    for f in files:
        if f.lower().endswith(('.jpg', '.jpeg', '.png')):
            p = os.path.join(root, f)
            rel = os.path.relpath(p, 'data')
            split_class = rel.split(os.sep)[:2]
            key = '/'.join(split_class)
            stats[key]['total'] += 1
            try:
                with open(p, 'rb') as fp:
                    b = fp.read(1024)
                if len(b) > 0:
                    stats[key]['readable'] += 1
                else:
                    stats[key]['cloud_only'] += 1
            except Exception:
                stats[key]['cloud_only'] += 1

print(f"{'Folder / Class':<35} | {'Total':<6} | {'Local/Readable':<14} | {'Cloud-Only':<10}")
print('-' * 72)
for k, v in sorted(stats.items()):
    print(f"{k:<35} | {v['total']:>6} | {v['readable']:>14} | {v['cloud_only']:>10}")

