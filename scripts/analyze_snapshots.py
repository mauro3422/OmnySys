import sqlite3, json

db = sqlite3.connect('omnysys.db')
rows = db.execute('SELECT snapshot_kind, payload_json FROM compiler_metrics_snapshots ORDER BY LENGTH(payload_json) DESC').fetchall()

for kind, payload_str in rows:
    data = json.loads(payload_str)
    total_size = len(payload_str) / 1024
    
    # Check snapshot sub-keys
    snapshot = data.get('snapshot', {})
    print(f"\n=== {kind} ({total_size:.1f} KB) ===")
    print(f"Top-level keys: {list(data.keys())}")
    print(f"Snapshot keys: {list(snapshot.keys())}")
    
    for key, val in snapshot.items():
        if isinstance(val, (dict, list)):
            size = len(json.dumps(val)) / 1024
            if size > 100:  # Only show large items
                print(f"  {key}: {size:.1f} KB")
                if isinstance(val, dict):
                    for subkey, subval in val.items():
                        subsize = len(json.dumps(subval)) / 1024
                        if subsize > 100:
                            print(f"    {subkey}: {subsize:.1f} KB")
