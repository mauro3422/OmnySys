import sqlite3, json

db = sqlite3.connect('omnysys.db')
row = db.execute('SELECT payload_json FROM compiler_metrics_snapshots WHERE snapshot_kind="folderization" ORDER BY LENGTH(payload_json) DESC LIMIT 1').fetchone()
data = json.loads(row[0])

semantic = data.get('snapshot', {}).get('databaseHealth', {}).get('metrics', {}).get('semanticSurface', {})

legacy = semantic.get('legacyView', {})
print("legacyView keys:", list(legacy.keys()))
for k, v in legacy.items():
    if isinstance(v, list):
        size = len(json.dumps(v)) / 1024
        print(f"  {k}: {len(v)} items ({size:.1f} KB)")
        if len(v) > 0:
            print(f"    Sample: {json.dumps(v[0])[:200]}")
    else:
        print(f"  {k}: {v}")
