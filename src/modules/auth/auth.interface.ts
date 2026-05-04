export interface IRegisterCustomerPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface ILoginUserPayload {
  email: string;
  password: string;
}

export interface IChangePasswordPayload {
  currentPassword?: string;
  newPassword: string;
}

export interface IUpdateProfilePayload {
  name?: string;
  email?: string;
  image?: string | null;
  phone?: string;
  fullName?: string;
}
