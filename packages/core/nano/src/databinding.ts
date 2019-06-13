/**
 * The interface for an object whose data can be bound to. We use this contract for
 * components that want to expose their data and its changes to other components.
 * An example of this would be Formula binding to a Tablero. In this scenario,
 * Tablero is expected to implement IDataProvider and expose some of its data, given
 * a reference, through getDataResult. Formula is expected to implement IDataObserver
 * and register itself as an observer to Tablero.
 *
 * Any component that implements IDataProvider is expected to provide some registration
 * functionality and to notify observers whenever the data they are bound to changes.
 */
export interface IDataProvider {
  /**
   * Binds the given observer to the component associated with this DataProvider.
   * @param dataObserver - The object to start listening to any changes in the bound data.
   */
  registerDataObserver(dataObserver: IDataObserver): void;

  /**
   * Unbinds the given observer from the component associated with this DataProvider.
   * @param dataObserver - The observer to unregister from the DataProvider.
   */
  unregisterDataObserver(dataObserver: IDataObserver): void;

  /**
   * Return IDataResult for the given dataBindingReference, containing the data value
   * and some additional metadata.
   * @param dataBindingReference - An instance of dataBindingReference, a reference
   * to some data in the bound component.
   */
  getDataResult(dataBindingReference: any): IDataResult | undefined;

  /**
   * Invoked when this data provider is deleted.
   */
  onDeleted(): void;
}

/**
 * The interface for an object that can bind to an IDataProvider.
 * One example of this provider-observer relationship is a Formula binding
 * to Tablero. In this scenario, Formula is an IDataObserver listening to changes
 * in the IDataProvider, Tablero.
 *
 * Any object that implements IDataObserver is expected to provide a
 * callback whenever the component it is bound to changes in value and a reference
 * to the data that the observer is bound to.
 */
export interface IDataObserver {
  /**
   * Invoked whenever the data this object is bound to is changed.
   */
  onBoundDataChanged: (result: IDataResult) => void;

  /**
   * The reference to the data that this observer is bound to.
   * TODO:DATABINDING: Get rid of this method. Data binding reference should
   * be passed on data registration.
   */
  getDataBindingReference: () => any;

  /**
   * Invoked whenever the provider this is bound to is deleted.
   */
  onDataProviderDeleted: () => void;
}

/**
 * IDataResult represents the result object passed through data binding between two components.
 * It provides query functions for retrieving values, hints, friendly names, and provides
 * basic traverse APIs to move to previous or next level results.
 */
export interface IDataResult {
  /**
   * Get the list of properties of this dataResult.
   * @returns a list of dataResults representing the next level objects.
   */
  getProperties: (query: string) => Promise<IDataResult[]>;

  /**
   * Return the raw value of this object.
   */
  getValue: () => Pending<IData | undefined>;

  /**
   * Return the hint text of this object.
   */
  getHint: () => string | undefined;

  /**
   * Return the friendlyName of this object.
   */
  getFriendlyName: () => string;

  /**
   * Return The dataBindingReference for this instance of DataProvider.
   */
  getBindingReference: () => any;

  /**
   * Get the parent DataResult object.
   * @returns an instance of IDataResult that represent the previous level (parent) of this object,
   * or undefined if this is the top level object.
   */
  getParent: () => IDataResult | undefined;
}

/**
 * Interface representing any data that can be bound to via Data Binding infrastructure.
 */
export type IData = string | number | ICustomData;

/**
 * Generic interface for custom defined data types.
 */
export interface ICustomData {
  type: string;

  data: any;
}

/**
 * Represents a linear (1D) collection of primitive values.
 */
// TODO: Consider changing ICollection and ITable to classes instead of interfaces?
export interface ICollection extends ICustomData {
  // TODO: Move this type into an enum
  type: "ICollection";

  data: (string | number)[];
}

/**
 * Represents a tabular (2D) set of of primitive values.
 */
export interface ITable extends ICustomData {
  // TODO: Move this type into an enum
  type: "ITable";

  data: ICollection[];
}
