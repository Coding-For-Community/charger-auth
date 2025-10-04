# ChargerAuth

### TODO!!!!!!
- Decide between AWS EC2 hosting(Elastic beanstalk doesn't allow sqlite according to aneesh) and Docker container hosting on a random CA computer. If proposition to mr. manakhov succeeds maybe use random CA computer
- Work out auth - i dont think there's a way to test this in a dev environment, except for face recognition(implemented, but LMAO 50% of CA students dont have one uploaded to blackbaud bruh)

### Setup
```bash
cd frontend
npm install

cd ../server
py -m venv .venv 
.venv/Scripts/Activate
pip install requirements.txt
py manage.py collectstatic
```

### How to run: backend
```bash
cd ../server
.venv/Scripts/Activate
py main.py
```
Then, create a new terminal and run
```bash
cd ../server
.venv/Scripts/Activate
py manage.py startdailyreset
```

### How to run: frontend
```bash
cd ../frontend
npm run dev
```

### How to run: production
To run things for production, just add the ```-prod``` flag to all commands you run.
In addition, make sure to create a superuser account with ```py manage.py createsuperuser -prod```.