import Fastify from 'fastify'
import multipart from '@fastify/multipart';
import { Fiel, HttpsWebClient, FielRequestBuilder, Service } from '@nodecfdi/sat-ws-descarga-masiva';
import { install } from '@nodecfdi/cfdiutils-common';
import { DOMParser, XMLSerializer, DOMImplementation } from '@xmldom/xmldom';
install(new DOMParser(), new XMLSerializer(), new DOMImplementation());

const fastify = Fastify({ logger: true })
fastify.register(multipart);

const SERVER_PORT = process.env.PORT || 3000;

// curl -X POST -H "Content-Type: multipart/form-data" -F "cert=@dummy.cer" -F "key=@dummy.key" -F "passphrase=dummy" http://localhost:3000/
fastify.post('/', async function handler(request, reply) {
    const { certFile, keyFile, passphrase } = await extractFielParts(request);
    const fiel = Fiel.create(certFile, keyFile, passphrase);

    const valid = fiel.isValid();
    const responseCode = valid ? 200 : 400;
    reply.code(responseCode).send({ valid });

    // Creación del cliente web se usa el cliente incluido en nodeJS.
    // const webClient = new HttpsWebClient();

    // creación del objeto encargado de crear las solicitudes firmadas usando una FIEL
    // const requestBuilder = new FielRequestBuilder(fiel);

    // Creación del servicio
    // const service = new Service(requestBuilder, webClient);
})

try {
    await fastify.listen({ port: SERVER_PORT })
} catch (err) {
    fastify.log.error(err)
    process.exit(1)
}

async function extractFielParts(request) {
    const parts = request.parts();
    let certFile, keyFile, passphrase;

    for await (const part of parts) {
        if (part.file) {
            if (part.fieldname === 'cert') {
                certFile = (await part.toBuffer()).toString('binary');
            } else if (part.fieldname === 'key') {
                keyFile = (await part.toBuffer()).toString('binary');
            }
        } else {
            if (part.fieldname === 'passphrase') {
                passphrase = part.value;
            }
        }
    }
    return { certFile, keyFile, passphrase };
}

