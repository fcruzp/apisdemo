npm init -y
npm install express dotenv
npm install -D typescript ts-node @types/express @types/node nodemon
npx tsc --init

git init
echo "node_modules\ndist\n.env" > .gitignore
git add .
git commit -m "Government Integration API Demo - initial commit"

Luego ve a github.com, crea un repositorio nuevo llamado government-api-demo — que sea público, sin README. Cuando lo crees GitHub te muestra los comandos para conectarlo, serán algo así:

git remote add origin https://github.com/TU_USUARIO/government-api-demo.git
git branch -M main
git push -u origin main
