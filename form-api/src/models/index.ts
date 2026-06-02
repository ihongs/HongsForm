export { BaseModel } from './BaseModel.js';
export { UserModel, UserSchema, UserCreateSchema, UserUpdateSchema, UserFindSchema } from './User.js';
export { UserApiKeyModel, UserApiKeySchema, UserApiKeyCreateSchema, UserApiKeyUpdateSchema, UserApiKeyFindSchema } from './UserApiKey.js';
export { FormModel, FormField, FormConfig, FormSchema, FormCreateSchema, FormUpdateSchema, FormFindSchema, FormFieldSchema, FormConfigSchema } from './Form.js';
export { FormRecordModel, FormRecordSchema, FormRecordCreateSchema, FormRecordUpdateSchema, FormRecordFindSchema } from './FormRecord.js';

import { Db } from 'mongodb';
import { UserModel } from './User.js';
import { UserApiKeyModel } from './UserApiKey.js';
import { FormModel } from './Form.js';
import { FormRecordModel } from './FormRecord.js';

export function createModels(db: Db) {
  return {
    user: new UserModel(db),
    userApiKey: new UserApiKeyModel(db),
    form: new FormModel(db),
    formRecord: new FormRecordModel(db),
  };
}

export type Models = ReturnType<typeof createModels>;
