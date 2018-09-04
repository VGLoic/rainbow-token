import {
  START_LOADING_USER,
  END_LOADING_USER,
  SET_USER,
  START_TRANSACTION,
  END_TRANSACTION
} from '../actionTypes';

const DEFAULT_STATE = {
  isLoading: false,
  inProgress: false,
  data: {}
};

export default (state = DEFAULT_STATE, {type, payload}) => {
  switch (type) {
    case START_LOADING_USER:
      return { ...state, isLoading: true };
    case END_LOADING_USER:
      return { ...state, isLoading: false };
    case SET_USER:
      return { ...state, data: payload };
    case START_TRANSACTION:
      return { ...state, inProgress: true };
    case END_TRANSACTION:
      return { ...state, inProgress: false };
    default:
      return state;
  }
}
