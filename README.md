# API para proyecto X

Probado con Node 16.

`node server.js`

ó si se van a estar haciendo cambios:

`nodemon server.js`




# 👇🏻 Acá continúa proyecto anterior:


# @nodecfdi/sat-ws-descarga-masiva

[![Source Code][badge-source]][source]
[![Npm Node Version Support][badge-node-version]][node-version]
[![Discord][badge-discord]][discord]
[![Latest Version][badge-release]][release]
[![Software License][badge-license]][license]
[![Build Status][badge-build]][build]
[![Reliability][badge-reliability]][reliability]
[![Maintainability][badge-maintainability]][maintainability]
[![Code Coverage][badge-coverage]][coverage]
[![Violations][badge-violations]][violations]
[![Total Downloads][badge-downloads]][downloads]

> Librería para usar el servicio web del SAT de Descarga Masiva

:us: The documentation of this project is in spanish as this is the natural language for intended audience.

:mexico: La documentación del proyecto está en español porque ese es el lenguaje principal de los usuarios.

## Instalación

```shell
npm i @nodecfdi/sat-ws-descarga-masiva --save
```

o

```shell
yarn add @nodecfdi/sat-ws-descarga-masiva
```

o

```shell
pnpm add @nodecfdi/sat-ws-descarga-masiva
```

## Ejemplos de uso

Todos los objetos de entrada y salida se pueden exportar como JSON para su fácil depuración.

## Creación del servicio

```ts
import { readFileSync } from 'fs';
import { Fiel, HttpsWebClient, FielRequestBuilder, Service } from '@nodecfdi/sat-ws-descarga-masiva';
import { install } from '@nodecfdi/cfdiutils-common';
import { DOMParser, XMLSerializer, DOMImplementation } from '@xmldom/xmldom';

//instala tu gestor de DOM preferido para este ejemplo se usa @xmldom/xmldom
install(new DOMParser(), new XMLSerializer(), new DOMImplementation());

// Creación de la FIEL, puede leer archivos DER (como los envía el SAT) o PEM (convertidos con openssl)
const fiel = Fiel.create(
    readFileSync('fake-fiel/EKU9003173C9.cer', 'binary'),
    readFileSync('fake-fiel/EKU9003173C9.key', 'binary'),
    '12345678a'
);
// verificar que la FIEL sea válida (no sea CSD y sea vigente acorde a la fecha del sistema)
if (!fiel.isValid()) {
    return;
}

// Creación del cliente web se usa el cliente incluido en nodeJS.
const webClient = new HttpsWebClient();

// creación del objeto encargado de crear las solicitudes firmadas usando una FIEL
const requestBuilder = new FielRequestBuilder(fiel);

// Creación del servicio
const service = new Service(requestBuilder, webClient);
```

## Cliente para consumir los servicios de CFDI de Retenciones

Existen dos tipos de Comprobantes Fiscales Digitales, los regulares (ingresos, egresos, traslados, nóminas y pagos), y los CFDI de retenciones e información de pagos (retenciones).

Puede utilizar esta librería para consumir los CFDI de Retenciones. Para lograrlo construya el servicio con la especificación de `ServiceEndpoints.retenciones()`.

Los constructores `ServiceEndpoints.cfdi()` y `ServiceEndpoints.retenciones()` agregan automáticamente la propiedad `ServiceType` al objeto. Esta propiedad será después utilizada el servicio para especificar el valor en la consulta antes de consumirla.

```ts
import { HttpsWebClient, RequestBuilderInterface, ServiceEndpoints, Service } from '@nodecfdi/sat-ws-descarga-masiva';
/**
 * @var webClient: HttpsWebClient
 * @var requestBuilder: RequestBuilderInterface
 */
// Creación del servicio
const service = new Service(requestBuilder, webClient, undefined, ServiceEndpoints.retenciones());
```

Aunque no es recomendado, también puedes construir el objeto ServiceEndpoints con direcciones URL del servicio personalizadas utilizando el constructor del objeto en lugar de los métodos estáticos.

## Realiza una consulta

Una vez creado el servicio, se puede presentar la consulta, si se pudo presentar devolverá el identificador de la solicitud, y con este identificador se podrá continuar al servicio de verificación.

- Periodo: Fecha y hora de inicio y fin de la consulta.
- Tipo de descarga: CFDI emitidos `DownloadType.issued` o recibidos `DownloadType.received`.
- Tipo de solicitud: De metadatos `RequestType.metadata` o de archivos CFDI `RequestType.cfdi`.
- Filtrado por RFC: Si se establece, se filtran para obtener únicamente donde la contraparte tenga el RFC indicado.

```ts
import { QueryParameters, DateTimePeriod } from '@nodecfdi/sat-ws-descarga-masiva';
/**
 * El servicio ya existe
 * @var service: Service
 */

const request = QueryParameters.create(
    DateTimePeriod.createFromValues('2022-01-01 00:00:00', '2022-02-28 23:59:59'));

// presentar la consulta
const query = await service.query(request);

// verificar que el proceso de consulta fue correcto
if (!query.getStatus().isAccepted()) {
    console.log(`Fallo al presentar la consulta: ${query.getStatus().getMessage()}`);
    return;
}
console.log(`Se generó la solicitud ${query.getRequestId()}`);
```

## Parámetros de la consulta

### Periodo (`DateTimePeriod`)

Fecha y hora de inicio y fin de la consulta. Si no se especifica crea un periodo del segundo exacto de la creación del objeto.

### Tipo de descarga (`DownloadType`)

Especifica si la solicitud es de documentos emitidos DownloadType::issued() o recibidos DownloadType::received(). Si no se especifica utiliza el valor de emitidos.

### Tipo de solicitud (`RequestType`)

Especifica si la solicitud es de Metadatos RequestType::metadata() o archivos XML RequestType::xml(). Si no se especifica utiliza el valor de Metadatos.

### Tipo de comprobante (`DocumentType`)

Filtra la solicitud por tipo de comprobante. Si no se especifica utiliza no utiliza el filtro.

- Cualquiera: `new DocumentType('undefined')` (predeterminado).
- Ingreso: `new DocumentType('ingreso')`.
- Egreso: `new DocumentType('egreso')`.
- Traslado: `new DocumentType('traslado')`.
- Nómina: `new DocumentType('nomina')`.
- Pago: `new DocumentType('pago')`.

### Tipo de complemento (ComplementoCfdi o ComplementoRetenciones)

Filtra la solicitud por la existencia de un tipo de complemento dentro del comprobante.
Si no se especifica utiliza `new ComplementoUndefined('undefined')` que excluye el filtro.

Hay dos tipos de objetos que satisfacen este parámetro, depende del tipo de comprobante que se está solicitando.
Si se trata de comprobantes de CFDI Regulares entonces se usa la clase `ComplementoCfdi`.
Si se trata de CFDI de retenciones e información de pagos entonces se usa la clase `ComplementoRetenciones`.

Estos objetos se pueden crear nombrados (`new ComplementoCfdi('leyendasFiscales10')`),
por constructor (`new ComplementoCfdi('leyendasfiscales10')`), o bien,
por el método estático `create` (`ComplementoCfdi::create('leyendasfiscales10')`).

Además, se puede acceder al nombre del complemento utilizando el método `label()`, por ejemplo,
`ComplementoCfdi::create('leyendasfiscales10').label(); // Leyendas Fiscales 1.0`.

### Estado del comprobante (`DocumentStatus`)

Filtra la solicitud por el estado de comprobante: Vigente (`new DocumentStatus('active')`) y Cancelado (`new DocumentStatus('cancelled')`).
Si no se especifica utiliza `new DocumentStatus('undefined')` que excluye el filtro.

### UUID (`Uuid`)

Filtra la solicitud por UUID.
Para crear el objeto del filtro hay que usar `Uuid.create('96623061-61fe-49de-b298-c7156476aa8b')`.
Si no se especifica utiliza `Uuid.empty()` que excluye el filtro.

#### Filtrado a cuenta de terceros (`RfcOnBehalf`)

Filtra la solicitud por el RFC utilizado a cuenta de terceros.
Para crear el objeto del filtro hay que usar `RfcOnBehalf.create('XXX01010199A')`.
Si no se especifica utiliza `RfcOnBehalf.empty()` que excluye el filtro.

#### Filtrado por RFC contraparte (`RfcMatch`/`RfcMatches`)

Filtra la solicitud por el RFC en contraparte, es decir, que
si la consulta es de emitidos entonces filtrará donde el RFC especificado sea el receptor,
si la consulta es de recibidos entonces filtrará donde el RFC especificado sea el emisor.

Para crear el objeto del filtro hay que usar `RfcMatch.create('XXX01010199A')`.
Si no se especifica utiliza una lista vacía `RfcMatches.create()` que excluye el filtro.

## Consulta con valores predeterminados

Valores predeterminados de una consulta:

- Consultar comprobantes emitidos `new DownloadType('issued')`.
- Solicitar información de metadata `new RequestType('metadata')`.
- Sin filtro de RFC.

```ts
import { RfcMatch } from '@nodecfdi/sat-ws-descarga-masiva';

const rfcMatch = RfcMatch.create('XXX01010199A');
parameters = parameters->withRfcMatch(rfcMatch);
console.log(rfcMatch === parameters.getRfcMatch()); // bool(true)
```

El servicio del SAT permite especificar hasta 5 RFC Receptores, al menos así lo establecen en su documentación.
Sin embargo, al tratarse de receptores, solo se puede utilizar en una consulta de documentos emitidos.
En el caso de una consulta de documentos recibidos, solo se utilizará el primero de la lista.

Por lo regular utilizará solamente los métodos `QueryParameter.getRfcMatch(): RfcMatch`
y `QueryParameter.withRfcMatch(rfcMatch: RfcMatch)`.

Sin embargo, si fuera necesario especificar el listado de RFC, se puede realizar de la siguiente manera:

```ts
parameters = parameters.withRfcMatches(
    RfcMatches.create(
        RfcMatch.create('AAA010101000'),
        RfcMatch.create('AAA010101001'),
        RfcMatch.create('AAA010101002')
    )
);
```

O bien, utilizar una lista de RFC como cadenas de texto:

```ts
parameters = parameters.withRfcMatches(
    RfcMatches.createFromValues('AAA010101000', 'AAA010101001', 'AAA010101002')
);
```

### Acerca de `RfcMatches`

Este objeto mantiene una lista de `RfcMatches`, pero con características especiales:

- Los objetos `RfcMatch` *vacíos* o *repetidos* son ignorados, solo se mantienen valores no vacíos únicos.
- El método `RfcMatch.getFirst()` devuelve siempre el primer elemento, si no existe entonces devuelve uno vacío.
- La clase `RfcMatch` es *iterable*, se puede hacer `forof()` sobre los elementos.
- La clase `RfcMatch` es *contable*, se puede usar el método `count()` sobre los elementos.

### Tipo de servicio (`ServiceType`)

Esta es una propiedad que bien se podría considerar interna y no necesitas especificarla en la consulta.
Por defecto está no definida y con el valor `undefined`. Se puede conocer si la propiedad ha sido definida
con la propiedad `hasServiceType(): bool` y cambiar con `withServiceType(ServiceType): ServiceType`.

No se recomienda definir esta propiedad y dejar que el servicio establezca el valor correcto
según a donde esté apuntando el servicio.

Cuando se ejecuta una consulta, el servicio (`Service`) automáticamente define esta propiedad si es que
no está definida estableciéndole el mismo valor que está definido en el objeto `ServiceEndpoints`.
Si esta propiedad ya estaba definida, y su valor no es el mismo que el definido en el objeto `ServiceEndpoints`
entonces se genera una `Error`.

### Ejemplo de especificación de parámetros

En el siguiente ejemplo, se crea una consulta sin parámetros y posteriormente se van modificando.

Puede que los cambios del ejemplo no sean lógicos, es solo para ilustrar cómo se establecen los valores:

- Un periodo específico de `2019-01-13 00:00:00` a `2019-01-13 23:59:59` (inclusive).
- Sobre los documentos recibidos.
- Solicitando los archivos XML.
- Filtrando por documentos de tipo ingreso.
- Filtrando por los que tengan el complemento de leyendas fiscales.
- Filtrando por únicamente documentos vigentes (excluye cancelados).
- Filtrando por el RFC a cuenta de terceros `XXX01010199A`.
- Filtrando por el RFC contraparte `MAG041126GT8`. Como se solicitan recibidos, entonces son los emidos por ese RFC.
- Filtrando por el UUID `96623061-61fe-49de-b298-c7156476aa8b`.

```ts
import { QueryParameters, DateTimePeriod, DownloadType, RequestType,
DocumentType, ComplementoCfdi, DocumentStatus, RfcOnBehalf, RfcMatch, Uuid
 } from '@nodecfdi/sat-ws-descarga-masiva';

const query = QueryParameters.create()
    .withPeriod(DateTimePeriod.createFromValues('2019-01-13 00:00:00', '2019-01-13 23:59:59'))
    .withDownloadType(DownloadType.received())
    .withRequestType(RequestType.xml())
    .withDocumentType(DocumentType.ingreso())
    .withComplement(ComplementoCfdi.leyendasFiscales10())
    .withDocumentStatus(DocumentStatus.active())
    .withRfcOnBehalf(RfcOnBehalf.create('XXX01010199A'))
    .withRfcMatch(RfcMatch.create('MAG041126GT8'))
    .withUuid(Uuid.create('96623061-61fe-49de-b298-c7156476aa8b'))
;
```

### Ejemplo de consulta por UUID

En este caso se especifica solamente el UUID a consultar, en el ejemplo es `96623061-61fe-49de-b298-c7156476aa8b`.

Nota: **Todos los demás argumentos de la consulta son ignorados**.

```ts
import { QueryParameters, Uuid } from '@nodecfdi/sat-ws-descarga-masiva';

$query = QueryParameters.create()
    .withUuid(Uuid.create('96623061-61fe-49de-b298-c7156476aa8b'))
;
```

## Verificar una consulta

La verificación depende de que la consulta haya sido aceptada.

```ts
import { Service } from '@nodecfdi/sat-ws-descarga-masiva';
/**
 * @var service: Service
 * @var requestId: Identificador generado al presentar la consulta, previamente fabricado
 */
// consultar el servicio de verificación
const verify = await service.verify(requestId);

// revisar que el proceso de verificación fue correcto
if (!verify.getStatus().isAccepted()) {
    console.log(`Fallo al verificar la consulta ${requestId}: ${verify.getStatus().getMessage()}`);
    return;
}

// revisar el progreso de la generación de los paquetes
const statusRequest = verify.getStatusRequest();
if (statusRequest.isTypeOf('Expired') || statusRequest.isTypeOf('Failure') || statusRequest.isTypeOf('Rejected')) {
    console.log(`La solicitud ${requestId} no se puede completar`);
    return;
}

if (statusRequest.isTypeOf('InProgress') || statusRequest.isTypeOf('Accepted')) {
    console.log(`La solicitud ${requestId} se está procesando`);
    return;
}
if (statusRequest.isTypeOf('Finished')) {
    console.log(`La solicitud ${requestId} está lista`);
}

console.log(`Se encontraron ${verify.countPackages()} paquetes`);
for (const packageId of verify.getPackageIds()) {
    console.log(` > ${packageId}`)
}
```

## Descarga los paquetes de la consulta

La descarga de los paquetes depende de que la consulta haya sido correctamente verificada.

Una consulta genera un identificador de la solicitud, la verificación retorna uno o varios identificadores de paquetes. Necesitas descargar todos y cada uno de los paquetes para tener la información completa de la consulta.

```ts
import { Service } from '@nodecfdi/sat-ws-descarga-masiva';
import { writeFileSync } from 'fs';
/**
 * @var service: Service
 * @var packagesIds: string[] El listado de identificadores de paquetes generado en la (correcta) verificación
 */
for (const packageId of packagesIds) {
    const download = await service.download(packageId);
    if (!download.getStatus().isAccepted()) {
        console.log(`El paquete ${packageId} no se ha podido descargar: ${download.getStatus().getMessage()}`);
        continue;
    }
    writeFileSync(`${packageId}.zip`, Buffer.from(download.getPackageContent(), 'base64'));
    console.log(`el paquete ${packageId} se ha almacenado`);
}
```

## Lectura de paquetes

Los paquetes de Metadata y CFDI se pueden leer con las clases MetadataPackageReader y CfdiPackageReader respectivamente. Para fabricar los objetos, se pueden usar sus métodos createFromFile para crearlo a partir de un archivo existente o createFromContents para crearlo a partir del contenido del archivo en memoria.

Cada paquete puede contener uno o más archivos internos. Cada paquete se lee individualmente.

## Lectura de paquetes de tipo Metadata

```ts
import { MetadataPackageReader, OpenZipFileException } from '@nodecfdi/sat-ws-descarga-masiva';
/**
 * @var zipfile: string contiene la ruta al archivo de paquete de Metadata
 */
let metadataReader: MetadataPackageReader;
// abrir el archivo de Metadata
try {
    metadataReader = await MetadataPackageReader.createFromFile(zipFile);
} catch (error) {
    const zipError = error as OpenZipFileException;
    console.log(zipError.message);
    return;
}

for await (const item of metadataReader.metadata()) {
    console.log(`${item.get('uuid')}   ${item.get('fechaEmision')}`);
}
```

## Lectura de paquetes de tipo CFDI

```ts
import { CfdiPackageReader, OpenZipFileException } from '@nodecfdi/sat-ws-descarga-masiva';
import { writeFileSync } from 'fs';
/**
 * @var zipfile: string contiene la ruta al archivo de paquete de archivos ZIP
 */

let cfdiReader: CfdiPackageReader;
try {
    cfdiReader = await CfdiPackageReader.createFromFile(zipFile);
} catch (error) {
    const zipError = error as OpenZipFileException;
    console.log(zipError.message);
    return;
}

for await (const map of cfdiPackageReader.cfdis()) {
    for (const [name, content] of map) {
        writeFileSync(`cfdis/${name}.xml`, Buffer.from(content, 'utf8'));
    }
}
```

## Información técnica

La información técnica puede ser leida del siguiente link: [CfdiPackageReader](https://github.com/phpcfdi/sat-ws-descarga-masiva#informaci%C3%B3n-t%C3%A9cnica) facilitada por la librería que inspiró a ésta.

## Copyright and License

The `nodecfdi/sat-ws-descarga-masiva` library is copyright © NodeCfdi and [OcelotlStudio](https://ocelotlstudio.com)
and licensed for use under the MIT License (MIT). Please see [LICENSE][] for more information.

[source]: https://github.com/nodecfdi/sat-ws-descarga-masiva
[node-version]: https://www.npmjs.com/package/@nodecfdi/sat-ws-descarga-masiva
[discord]: https://discord.gg/AsqX8fkW2k
[release]: https://www.npmjs.com/package/@nodecfdi/sat-ws-descarga-masiva
[license]: https://github.com/nodecfdi/sat-ws-descarga-masiva/blob/main/LICENSE
[build]: https://github.com/nodecfdi/sat-ws-descarga-masiva/actions/workflows/build.yml?query=branch:main
[reliability]:https://sonarcloud.io/component_measures?id=nodecfdi_sat-ws-descarga-masiva&metric=Reliability
[maintainability]: https://sonarcloud.io/component_measures?id=nodecfdi_sat-ws-descarga-masiva&metric=Maintainability
[coverage]: https://sonarcloud.io/component_measures?id=nodecfdi_sat-ws-descarga-masiva&metric=Coverage
[violations]: https://sonarcloud.io/project/issues?id=nodecfdi_sat-ws-descarga-masiva&resolved=false
[downloads]: https://www.npmjs.com/package/@nodecfdi/sat-ws-descarga-masiva

[badge-source]: https://img.shields.io/badge/source-nodecfdi/sat--ws--descarga--masiva-blue.svg?logo=github
[badge-node-version]: https://img.shields.io/node/v/@nodecfdi/sat-ws-descarga-masiva.svg?logo=nodedotjs
[badge-discord]: https://img.shields.io/discord/459860554090283019?logo=discord
[badge-release]: https://img.shields.io/npm/v/@nodecfdi/sat-ws-descarga-masiva.svg?logo=npm
[badge-license]: https://img.shields.io/github/license/nodecfdi/sat-ws-descarga-masiva.svg?logo=open-source-initiative
[badge-build]: https://img.shields.io/github/actions/workflow/status/nodecfdi/sat-ws-descarga-masiva/build.yml?branch=main
[badge-reliability]: https://sonarcloud.io/api/project_badges/measure?project=nodecfdi_sat-ws-descarga-masiva&metric=reliability_rating
[badge-maintainability]: https://sonarcloud.io/api/project_badges/measure?project=nodecfdi_sat-ws-descarga-masiva&metric=sqale_rating
[badge-coverage]: https://img.shields.io/sonar/coverage/nodecfdi_sat-ws-descarga-masiva/main?logo=sonarcloud&server=https%3A%2F%2Fsonarcloud.io
[badge-violations]: https://img.shields.io/sonar/violations/nodecfdi_sat-ws-descarga-masiva/main?format=long&logo=sonarcloud&server=https%3A%2F%2Fsonarcloud.io
[badge-downloads]: https://img.shields.io/npm/dm/@nodecfdi/sat-ws-descarga-masiva.svg?logo=npm
