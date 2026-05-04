export interface IcreateAdmin {
  password: string;
  admin: {
    name: string;
    email: string;
    contactNumber?: string;
    profilePhoto?: string;
  };
}
