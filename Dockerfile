FROM denoland/deno:alpine-1.23.1

RUN sed -i -e 's/v3\.13/v3.16/g' /etc/apk/repositories
RUN apk add --no-cache postgresql14-client

RUN mkdir -p /work

WORKDIR /work
COPY ./*.ts /work/
RUN deno cache ./main.ts

CMD ["run", "--allow-run", "--allow-net", "--allow-env", "./main.ts"]

