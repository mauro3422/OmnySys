import sqlite3, json

db = sqlite3.connect('omnysys.db')
row = db.execute('SELECT payload_json FROM compiler_metrics_snapshots WHERE snapshot_kind="folderization" ORDER BY LENGTH(payload_json) DESC LIMIT 1').fetchone()
data = json.loads(row[0])

semantic = data.get('snapshot', {}).get('databaseHealth', {}).get('metrics', {}).get('semanticSurface', {})

print(f"semanticSurface type: {type(semantic)}")
print(f"semanticSurface keys: {list(semantic.keys()) if isinstance(semantic, dict) else 'N/A'}")

for key, val in semantic.items():
    if isinstance(val, list):
        size = len(json.dumps(val)) / 1024
        print(f"\n{key}: {len(val)} items ({size:.1f} KB)")
        if len(val) > 0:
            print(f"  First item: {json.dumps(val[0])[:300]}")
    elif isinstance(val, dict):
        size = len(json.dumps(val)) / 1024
        print(f"\n{key}: dict ({size:.1f} KB)")
    else:
        print(f"\n{key}: {val}")
