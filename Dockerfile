FROM node:10-alpine as builder

WORKDIR /opt/app

ARG NPM_TOKEN
ARG NPM_PROJECTS_TOKEN

COPY package.json /opt/app/package.json
COPY package-lock.json /opt/app/package-lock.json

RUN npm i

COPY . /opt/app

RUN npm publish