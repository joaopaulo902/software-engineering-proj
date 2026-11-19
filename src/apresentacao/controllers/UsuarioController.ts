import { Request, Response, NextFunction } from 'express';
import { PerfilCompleto, UsuarioService } from '../../dominio/servicos/UsuarioService';
import { DadosDoPerfil } from '../../persistencia/interfaces/IUsuarioRepository';
import { lerId } from '../parametros';

/** Limites do perfil; o banco confere os mesmos (db/01-schema.sql). */
export const LIMITES_DO_PERFIL = { descricao: 1000, contato: 200, link: 300, curso: 100 };

const LINKS = [
  { campo: 'lattes', nome: 'Currículo Lattes' },
  { campo: 'linkedin', nome: 'LinkedIn' },
  { campo: 'github', nome: 'GitHub' },
  { campo: 'paginaPessoal', nome: 'Página pessoal' }
] as const;

/** C16 - Visualizar e editar perfil. */
export class UsuarioController {
  constructor(private readonly servico: UsuarioService) {}

  /** GET /api/usuarios/:id/perfil */
  perfil = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuarioId = lerId(req.params.id);
      if (!usuarioId) {
        res.status(400).json({ erro: 'Usuário inválido.' });
        return;
      }
      const perfil = await this.servico.perfil(usuarioId, req.session.usuarioId as number);
      res.json(apresentarPerfil(perfil));
    } catch (erro) {
      next(erro);
    }
  };

  /** PUT /api/perfil - Configuracoes: cada um edita so o proprio perfil. */
  atualizarPerfil = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leitura = lerDadosDoPerfil(req.body ?? {});
      if (typeof leitura === 'string') {
        res.status(400).json({ erro: leitura });
        return;
      }
      const usuarioId = req.session.usuarioId as number;
      await this.servico.atualizarPerfil(usuarioId, leitura);
      res.json(apresentarPerfil(await this.servico.perfil(usuarioId, usuarioId)));
    } catch (erro) {
      next(erro);
    }
  };
}

/**
 * O perfil como a tela recebe. Montado campo a campo (nada de serializar a
 * entidade): o e-mail so vai quando quem ve pode ve-lo.
 */
function apresentarPerfil({ usuario, ehProprio, emailVisivel, projetos }: PerfilCompleto) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    papel: usuario.papel,
    curso: usuario.curso,
    semestre: usuario.semestre,
    email: emailVisivel ? usuario.email : null,
    ehProprio,
    descricao: usuario.perfil.descricao,
    contato: usuario.perfil.contato,
    lattes: usuario.perfil.lattes,
    linkedin: usuario.perfil.linkedin,
    github: usuario.perfil.github,
    paginaPessoal: usuario.perfil.paginaPessoal,
    projetos: projetos.map((item) => ({
      projetoId: item.projetoId,
      projetoNome: item.projetoNome,
      projetoArea: item.projetoArea,
      cargo: item.cargo,
      coordenador: item.participacao === null,
      ativa: item.participacao ? item.participacao.estaAtiva() : true,
      inicio: item.participacao?.inicio ?? null,
      fim: item.participacao?.fim ?? null
    }))
  };
}

/**
 * Le o corpo do PUT /api/perfil. Devolve os dados prontos, ou o texto do
 * primeiro problema. Campo ausente ou em branco vira vazio: e assim que a
 * pessoa apaga um link.
 */
export function lerDadosDoPerfil(corpo: any): DadosDoPerfil | string {
  if (typeof corpo !== 'object' || corpo === null || Array.isArray(corpo)) {
    return 'Envie os dados do perfil.';
  }
  // O PostgreSQL nao grava o caractere NUL em texto: recusaria com erro 500.
  // (o JSON.stringify escreve esse caractere como o texto \u0000)
  if (JSON.stringify(corpo).includes('\\u0000')) {
    return 'O texto tem um caractere inválido.';
  }

  const descricao = lerCampo(corpo.descricao);
  if (descricao === null) return 'A descrição deve ser um texto.';
  if (descricao.length > LIMITES_DO_PERFIL.descricao) {
    return `A descrição deve ter até ${LIMITES_DO_PERFIL.descricao} caracteres.`;
  }

  const contato = lerCampo(corpo.contato);
  if (contato === null) return 'As informações de contato devem ser um texto.';
  if (contato.length > LIMITES_DO_PERFIL.contato) {
    return `As informações de contato devem ter até ${LIMITES_DO_PERFIL.contato} caracteres.`;
  }

  const links: Record<string, string | null> = {};
  for (const { campo, nome } of LINKS) {
    const valor = lerCampo(corpo[campo]);
    if (valor === null) return `O link do ${nome} deve ser um texto.`;
    if (valor === '') {
      links[campo] = null;
      continue;
    }
    if (valor.length > LIMITES_DO_PERFIL.link || !ehEnderecoWeb(valor)) {
      return `O link do ${nome} deve ser um endereço completo, começando com http:// ou https://.`;
    }
    links[campo] = valor;
  }

  const curso = lerCampo(corpo.curso);
  if (curso === null) return 'O curso deve ser um texto.';
  if (curso.length > LIMITES_DO_PERFIL.curso) {
    return `O curso deve ter até ${LIMITES_DO_PERFIL.curso} caracteres.`;
  }

  let semestre: number | null = null;
  if (corpo.semestre !== undefined && corpo.semestre !== null && corpo.semestre !== '') {
    semestre = Number(corpo.semestre);
    if (!Number.isInteger(semestre) || semestre < 1 || semestre > 20) {
      return 'O semestre deve ser de 1 a 20.';
    }
  }

  return {
    descricao,
    contato,
    lattes: links.lattes,
    linkedin: links.linkedin,
    github: links.github,
    paginaPessoal: links.paginaPessoal,
    curso: curso || null,
    semestre
  };
}

/** Texto sem espacos nas pontas; ausente vira ''. Devolve null se nao for texto. */
function lerCampo(valor: unknown): string | null {
  if (valor === undefined || valor === null) return '';
  return typeof valor === 'string' ? valor.trim() : null;
}

/**
 * So http e https: a tela transforma o link em <a href>, e um endereco
 * "javascript:" viraria codigo rodando no navegador de quem visita o perfil.
 */
function ehEnderecoWeb(texto: string): boolean {
  if (/\s/.test(texto)) return false;
  try {
    const url = new URL(texto);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}
