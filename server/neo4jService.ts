import neo4j, { Driver, Session } from 'neo4j-driver';
import { GraphNode, GraphLink, Neo4jConnectionConfig } from '../src/types';
import { knowledgeBase } from './knowledgeBase';

export class Neo4jService {
  private driver: Driver | null = null;
  private config: Neo4jConnectionConfig = {
    host: process.env.NEO4J_URI || 'bolt://161.97.181.77:7688',
    boltPort: 7688,
    httpPort: 7475,
    user: process.env.NEO4J_USER || 'ongdb',
    pass: process.env.NEO4J_PASSWORD || '$$$Amcp120$$$',
    database: 'neonormaslegales',
    status: 'disconnected'
  };

  constructor() {
    this.initDriver();
  }

  public getConfig(): Neo4jConnectionConfig {
    const graphData = knowledgeBase.getGraphData();
    return {
      ...this.config,
      nodeCount: this.config.nodeCount || graphData.nodes.length,
      relationshipCount: this.config.relationshipCount || graphData.links.length
    };
  }

  public updateConfig(newConfig: Partial<Neo4jConnectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initDriver();
  }

  private httpOk = false;

  private httpBase(): string {
    return process.env.NEO4J_HTTP_URL || 'http://161.97.181.77:7475';
  }

  private async cypherHttp(statements: { statement: string; parameters?: Record<string, any> }[]): Promise<any[]> {
    const auth = Buffer.from(`${this.config.user}:${this.config.pass}`).toString('base64');
    const r = await fetch(`${this.httpBase()}/db/data/transaction/commit`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Connection: 'close' },
      body: JSON.stringify({ statements })
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j: any = await r.json();
    if (j.errors?.length) throw new Error(JSON.stringify(j.errors).slice(0, 200));
    return j.results || [];
  }

  private async initDriver(): Promise<void> {
    try {
      // ONgDB 3.x no negocia Bolt con driver v6: probar HTTP primero
      try {
        await this.cypherHttp([{ statement: 'RETURN 1 AS x' }]);
        this.httpOk = true;
        this.config.status = 'connected';
        this.config.lastConnected = new Date().toISOString();
        console.log(`[Neo4j] Connected via HTTP to ${this.httpBase()} (ONgDB)`);
        await this.syncKnowledgeBaseToNeo4j();
        return;
      } catch (e: any) {
        console.warn(`[Neo4j] HTTP connection failed (${e.message}), trying Bolt driver...`);
      }
      if (this.driver) {
        await this.driver.close();
        this.driver = null;
      }

      const uri = this.config.host.startsWith('bolt://') || this.config.host.startsWith('neo4j://')
        ? this.config.host
        : `bolt://${this.config.host}:${this.config.boltPort}`;

      this.driver = neo4j.driver(
        uri,
        neo4j.auth.basic(this.config.user, this.config.pass),
        {
          connectionTimeout: 5000,
          maxConnectionPoolSize: 50
        }
      );

      // Verify connection
      const serverInfo = await this.driver.getServerInfo();
      this.config.status = 'connected';
      this.config.lastConnected = new Date().toISOString();
      console.log(`[Neo4j] Connected successfully to ${serverInfo.address} (Agent: ${serverInfo.agent})`);

      // Auto synchronize initial Tax Law Knowledge Graph
      await this.syncKnowledgeBaseToNeo4j();
    } catch (err: any) {
      console.warn(`[Neo4j] Remote connection to ${this.config.host} failed (${err.message}). Using integrated GraphRAG engine with Neo4j Cypher emulator.`);
      this.config.status = 'simulated';
    }
  }

  public async checkConnection(): Promise<{ status: string; message: string; config: Neo4jConnectionConfig }> {
    try {
      if (this.httpOk) {
        await this.cypherHttp([{ statement: 'RETURN 1 AS x' }]);
        this.config.status = 'connected';
      } else if (!this.driver) {
        await this.initDriver();
      } else {
        await this.driver.verifyConnectivity();
        this.config.status = 'connected';
      }
      return {
        status: this.config.status,
        message: this.config.status === 'connected' ? 'Conexión activa con el servidor Neo4j' : 'Modo Grafo Local Activo',
        config: this.getConfig()
      };
    } catch (err: any) {
      this.config.status = 'simulated';
      return {
        status: 'simulated',
        message: `Servidor remoto no disponible (${err.message}). Operando con Grafo en memoria optimizado.`,
        config: this.getConfig()
      };
    }
  }

  public async executeCypher(cypherQuery: string, params: Record<string, any> = {}): Promise<any> {
    // ONgDB via HTTP (driver Bolt v6 incompatible con ONgDB 3.x)
    if (this.httpOk && this.config.status === 'connected') {
      const results = await this.cypherHttp([{ statement: cypherQuery, parameters: params }]);
      const res = results[0] || { columns: [], data: [] };
      return {
        source: 'neo4j_http',
        records: res.data.map((d: any) => Object.fromEntries(res.columns.map((c: string, i: number) => [c, d.row[i]]))),
        summary: { statement: cypherQuery }
      };
    }
    // If real Neo4j driver is active and connected
    if (this.driver && this.config.status === 'connected') {
      const session: Session = this.driver.session({ database: this.config.database });
      try {
        const result = await session.run(cypherQuery, params);
        return {
          source: 'neo4j_remote',
          records: result.records.map(r => r.toObject()),
          summary: {
            statement: result.summary.query.text,
            resultAvailableAfter: result.summary.resultAvailableAfter?.toNumber?.() || 0
          }
        };
      } catch (err: any) {
        console.error('[Neo4j] Cypher execution error:', err);
        throw err;
      } finally {
        await session.close();
      }
    }

    // Local Graph Cypher simulation for queries
    return this.simulateCypher(cypherQuery);
  }

  private simulateCypher(query: string): any {
    const { nodes, links } = knowledgeBase.getGraphData();
    const queryLower = query.toLowerCase();

    let filteredNodes = nodes;
    if (queryLower.includes('where') || queryLower.includes('devengo') || queryLower.includes('causalidad') || queryLower.includes('renta')) {
      const keywords = ['devengo', 'causalidad', 'credito', 'confiscatorio', 'norma', 'renta', 'igv', 'prescripcion'];
      const matchedKw = keywords.filter(k => queryLower.includes(k));
      if (matchedKw.length > 0) {
        filteredNodes = nodes.filter(n =>
          matchedKw.some(k => n.name.toLowerCase().includes(k) || (n.properties?.summary && n.properties.summary.toLowerCase().includes(k)))
        );
      }
    }

    const matchedNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = links.filter(l => matchedNodeIds.has(l.source as string) || matchedNodeIds.has(l.target as string));

    return {
      source: 'neo4j_local_engine',
      nodes: filteredNodes,
      relationships: filteredLinks,
      records: filteredNodes.map(node => ({
        n: {
          identity: node.id,
          labels: [node.label],
          properties: { name: node.name, ...node.properties }
        }
      })),
      summary: {
        statement: query,
        nodesFound: filteredNodes.length,
        relationshipsFound: filteredLinks.length
      }
    };
  }

  public async syncKnowledgeBaseToNeo4j(): Promise<{ syncedNodes: number; syncedLinks: number }> {
    const { nodes, links } = knowledgeBase.getGraphData();
    // ONgDB via HTTP en lote (un commit)
    if (this.httpOk && this.config.status === 'connected') {
      try {
        const byLabel: Record<string, any[]> = {};
        for (const node of nodes) {
          (byLabel[node.label] = byLabel[node.label] || []).push({
            id: node.id,
            name: node.name,
            summary: node.properties?.summary || node.properties?.definition || '',
            legalBasis: node.properties?.legalBasis || ''
          });
        }
        const stmts = Object.entries(byLabel).map(([label, rows]) => ({
          statement: `UNWIND $rows AS r MERGE (n:${label} {id: r.id}) SET n.name = r.name, n.summary = r.summary, n.legalBasis = r.legalBasis`,
          parameters: { rows }
        }));
        const byType: Record<string, any[]> = {};
        for (const link of links) {
          const t = String(link.type).replace(/[^A-Za-z0-9_]/g, '_');
          (byType[t] = byType[t] || []).push({ source: link.source, target: link.target });
        }
        for (const [type, rows] of Object.entries(byType)) {
          stmts.push({
            statement: `UNWIND $rows AS r MATCH (a {id: r.source}), (b {id: r.target}) MERGE (a)-[:${type}]->(b)`,
            parameters: { rows }
          });
        }
        await this.cypherHttp(stmts);
      } catch (e: any) {
        console.warn('[Neo4j] Error syncing knowledge base via HTTP:', e.message);
      }
      return { syncedNodes: nodes.length, syncedLinks: links.length };
    }
    if (!this.driver || this.config.status !== 'connected') {
      return { syncedNodes: nodes.length, syncedLinks: links.length };
    }

    const session = this.driver.session({ database: this.config.database });
    try {
      // Upsert nodes
      for (const node of nodes) {
        await session.run(
          `MERGE (n:${node.label} {id: $id})
           SET n.name = $name, n.summary = $summary, n.legalBasis = $legalBasis`,
          {
            id: node.id,
            name: node.name,
            summary: node.properties?.summary || node.properties?.definition || '',
            legalBasis: node.properties?.legalBasis || ''
          }
        );
      }

      // Upsert links
      for (const link of links) {
        await session.run(
          `MATCH (a {id: $source}), (b {id: $target})
           MERGE (a)-[r:${link.type}]->(b)
           RETURN r`,
          {
            source: link.source,
            target: link.target
          }
        );
      }

      return { syncedNodes: nodes.length, syncedLinks: links.length };
    } catch (e: any) {
      console.warn('[Neo4j] Error syncing knowledge base:', e.message);
      return { syncedNodes: nodes.length, syncedLinks: links.length };
    } finally {
      await session.close();
    }
  }

  public getRelatedGraphContext(keywords: string[]): { nodes: GraphNode[]; links: GraphLink[]; contextText: string } {
    const { nodes, links } = knowledgeBase.getGraphData();
    const relevantNodeIds = new Set<string>();

    for (const node of nodes) {
      const nodeText = `${node.name} ${node.label} ${JSON.stringify(node.properties || {})}`.toLowerCase();
      if (keywords.some(k => nodeText.includes(k.toLowerCase()))) {
        relevantNodeIds.add(node.id);
      }
    }

    // Expand 1 hop in relationships
    for (const link of links) {
      const sId = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const tId = typeof link.target === 'string' ? link.target : (link.target as any).id;

      if (relevantNodeIds.has(sId) || relevantNodeIds.has(tId)) {
        relevantNodeIds.add(sId);
        relevantNodeIds.add(tId);
      }
    }

    const matchedNodes = nodes.filter(n => relevantNodeIds.has(n.id));
    const matchedLinks = links.filter(l => {
      const sId = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const tId = typeof l.target === 'string' ? l.target : (l.target as any).id;
      return relevantNodeIds.has(sId) && relevantNodeIds.has(tId);
    });

    let contextText = '';
    if (matchedNodes.length > 0) {
      contextText = '--- RELACIONES DEL GRAFO DE CONOCIMIENTO (Neo4j GraphRAG) ---\n';
      matchedNodes.forEach(node => {
        contextText += `[${node.label}] ${node.name}: ${node.properties?.summary || node.properties?.definition || node.properties?.legalBasis || ''}\n`;
      });
      matchedLinks.forEach(link => {
        const sNode = matchedNodes.find(n => n.id === link.source)?.name || link.source;
        const tNode = matchedNodes.find(n => n.id === link.target)?.name || link.target;
        contextText += `(${sNode}) -[:${link.type}]-> (${tNode})\n`;
      });
      contextText += '------------------------------------------------------------\n';
    }

    return {
      nodes: matchedNodes,
      links: matchedLinks,
      contextText
    };
  }
}

export const neo4jService = new Neo4jService();
