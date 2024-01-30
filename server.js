import Fastify from 'fastify'
import multipart from '@fastify/multipart';
import { Fiel, HttpsWebClient, FielRequestBuilder, Service, ServiceEndpoints } from '@nodecfdi/sat-ws-descarga-masiva';
import { install } from '@nodecfdi/cfdiutils-common';
import { DOMParser, XMLSerializer, DOMImplementation } from '@xmldom/xmldom';
import { QueryParameters, DateTimePeriod } from '@nodecfdi/sat-ws-descarga-masiva';
install(new DOMParser(), new XMLSerializer(), new DOMImplementation());

const fastify = Fastify({ logger: true })
fastify.register(multipart);

const SERVER_PORT = process.env.PORT || 3000;

// curl -X POST -H "Content-Type: multipart/form-data" -F "cert=@dummy.cer" -F "key=@dummy.key" -F "passphrase=dummy" -F "startDate=2024-01-01" -F "endDate=2024-01-05" http://localhost:3000/
fastify.post('/', async function handler(request, reply) {
    const { certFile, keyFile, passphrase, startDate, endDate } = await extractParts(request);
    const fiel = Fiel.create(certFile, keyFile, passphrase);

    const valid = fiel.isValid();
    if(!valid) {
        reply.code(400).send({ valid });
        return;
    }

    console.info({startDate, endDate})

    // Creación del cliente web se usa el cliente incluido en nodeJS.
    const webClient = new HttpsWebClient();

    // creación del objeto encargado de crear las solicitudes firmadas usando una FIEL
    const requestBuilder = new FielRequestBuilder(fiel);

    // Creación del servicio
    const service = new Service(requestBuilder, webClient, undefined, ServiceEndpoints.retenciones());
    const satRequest = QueryParameters.create(
        DateTimePeriod.createFromValues(startDate, endDate));

    const query = await service.query(satRequest);

    if (!query.getStatus().isAccepted()) {
        console.error(`Fallo al presentar la consulta: ${query.getStatus().getMessage()}`);
        reply.code(400).send({ message: query.getStatus().getMessage() });
        return;
    }

    reply.code(200).send({ requestId: query.getRequestId() });
})

try {
    await fastify.listen({ port: SERVER_PORT })
} catch (err) {
    fastify.log.error(err)
    process.exit(1)
}

async function extractParts(request) {
    const parts = request.parts();
    let certFile, keyFile, passphrase, startDate, endDate;

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
            } else if (part.fieldname === 'startDate') {
                startDate = part.value + ' 00:00:00';
            } else if (part.fieldname === 'endDate') {
                endDate = part.value + ' 00:00:00';
            }
        }
    }
    return { certFile, keyFile, passphrase, startDate, endDate };
}

