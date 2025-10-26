declare module 'react-native-sqlite-storage' {
  export type SQLiteDatabase = {
    executeSql: (statement: string, params?: unknown[]) => Promise<[any, any]>;
  };

  type OpenDatabaseParams = {
    name: string;
    location: string;
  };

  interface SQLiteModule {
    enablePromise?: (enable: boolean) => void;
    openDatabase: (options: OpenDatabaseParams) => Promise<SQLiteDatabase>;
  }

  const SQLite: SQLiteModule;
  export default SQLite;
}
