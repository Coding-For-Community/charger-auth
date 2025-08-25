# ChargerAuth

### Setup
```bash
cd mobile-app
npm install

cd ../server
py -m venv .venv 
.venv/Scripts/Activate # enables venv
pip install requirements.txt
py manage.py collectstatic
```

### How to run: backend
```bash
cd ../server
.venv/Scripts/Activate # enables venv
py main.py
```

### How to run: frontend apps
```bash
cd ../{app_name}
npx expo start
```