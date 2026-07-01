import {
  buildCachedDiscoveryReply,
  resolveSegmentFromText,
} from './segment-resolver';

describe('segment-resolver', () => {
  it('deve identificar segmento Tecnologia a partir de consertar celular', () => {
    expect(resolveSegmentFromText('consertar celular')).toBe('Tecnologia');
  });

  it('deve identificar segmento pelo nome exato', () => {
    expect(resolveSegmentFromText('preciso de algo em Saúde')).toBe('Saúde');
  });

  it('deve retornar null quando não houver correspondência', () => {
    expect(resolveSegmentFromText('xyz abc')).toBeNull();
  });

  it('deve montar resposta em cache com contagem de empresas', () => {
    expect(buildCachedDiscoveryReply('Tecnologia', 2)).toContain(
      '2 empresas disponíveis',
    );
  });
});
