import sqlite3, json

db = sqlite3.connect('omnysys.db')
row = db.execute('SELECT payload_json FROM compiler_metrics_snapshots WHERE snapshot_kind="folderization" ORDER BY LENGTH(payload_json) DESC LIMIT 1').fetchone()
data = json.loads(row[0])

metrics = data.get('snapshot', {}).get('databaseHealth', {}).get('metrics', {})

for key in metrics.keys():
    val = metrics[key]
    if isinstance(val, list):
        size = len(json.dumps(val)) / 1024
        print(f"{key}: LIST with {len(val)} items ({size:.1f} KB)")
        if len(val) > 0 and isinstance(val[0], dict):
            print(f"  Sample keys: {list(val[0].keys())[:10]}")
    elif isinstance(val, dict):
        size = len(json.dumps(val)) / 1024
        print(f"{key}: DICT with {len(val)} keys ({size:.1f} KB)")
    elif isinstance(val, (int, float)):
        print(f"{key}: {val}")
    else:
        size = len(json.dumps(val)) / 1024
        print(f"{key}: {str(val)[:100]} ({size:.1f} KB)")
