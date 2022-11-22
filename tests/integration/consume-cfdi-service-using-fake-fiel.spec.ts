import { TestCase } from '../test-case';
import { RequestBuilderInterface } from '~/request-builder/request-builder-interface';
import { HttpsWebClient } from '~/web-client/https-web-client';
import { Service } from '~/service';
import { QueryParameters } from '~/services/query/query-parameters';
import { ServiceEndpoints } from '~/shared/service-endpoints';
import { DateTimePeriod, DownloadType, RequestType } from '~/index';
import { DocumentType } from '~/shared/document-type';
import { ComplementoCfdi } from '~/shared/complemento-cfdi';
import { DocumentStatus } from '~/shared/document-status';
import { RfcOnBehalf } from '~/shared/rfc-on-behalf';
import { RfcMatch } from '~/shared/rfc-match';
import { Uuid } from '~/shared/uuid';
import { ServiceType } from '~/shared/service-type';
import { QueryResult } from '~/services/query/query-result';

describe('consume cfdi service using fake fiel', () => {
    let requestBuilder: RequestBuilderInterface;
    let webClient: HttpsWebClient;
    let service: Service;

    function getServiceEndpoints(): ServiceEndpoints {
        return ServiceEndpoints.cfdi();
    }

    beforeEach(() => {
        requestBuilder = TestCase.createFielRequestBuilderUsingTestingFiles();
        webClient = new HttpsWebClient();
        service = new Service(requestBuilder, webClient, undefined, getServiceEndpoints());
    });

    test('authentication', async () => {
        const token = await service.authenticate();
        expect(token.isValid()).toBeTruthy();
    }, 10000);

    test('query default parameters', async () => {
        const parameters = QueryParameters.create();

        const result = await service.query(parameters);
        expect(result.getStatus().getCode()).toBe(305);
    });

    test('query change all parameteres', async () => {
        const parameters = QueryParameters.create()
            .withPeriod(DateTimePeriod.createFromValues('2019-01-01 00:00:00', '2019-01-01 00:04:00'))
            .withDownloadType(new DownloadType('received'))
            .withRequestType(new RequestType('xml'))
            .withDocumentType(new DocumentType('nomina'))
            .withComplement(new ComplementoCfdi('nomina12'))
            .withDocumentStatus(new DocumentStatus('active'))
            .withRfcOnBehalf(RfcOnBehalf.create('XXX01010199A'))
            .withRfcMatch(RfcMatch.create('AAA010101AAA'));

        const result = await service.query(parameters);
        expect(result.getStatus().getCode()).toBe(305);
    }, 10000);

    test('query uuid', async () => {
        const parameters = QueryParameters.create().withUuid(Uuid.create('96623061-61fe-49de-b298-c7156476aa8b'));

        const result = await service.query(parameters);
        expect(result.getStatus().getCode()).toBe(305);
    });

    test('service endpoints different than query endpoints throws error', async () => {
        const otherServiceType = new ServiceType('retenciones');
        const parameters = QueryParameters.create().withServiceType(otherServiceType);
        const result = async (): Promise<QueryResult> => await service.query(parameters);
        await expect(result).rejects.toThrow(Error);
    });

    test('verify', async () => {
        const requestId = '3edbd462-9fa0-4363-b60f-bac332338028';

        const result = await service.verify(requestId);

        expect(result.getStatus().getCode()).toBe(305);
    }, 10000);

    test('download', async () => {
        const requestId = '4e80345d-917f-40bb-a98f-4a73939343c5_01';

        const result = await service.download(requestId);

        expect(result.getStatus().getCode()).toBe(305);
    }, 10000);
});
