# select the base image
FROM node:20.0.0-slim

# set the work directory
WORKDIR /frontend-app

# copy package.json file into conatiner
COPY package.json /frontend-app/

# install dependencies
RUN npm install 

# copy rest of the code into container
COPY . .

EXPOSE 3000
# run a application
CMD ["node", "index.js"]
