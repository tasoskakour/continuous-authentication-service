import { AuthAppPage } from './app.po';

describe('auth-app App', function() {
  let page: AuthAppPage;

  beforeEach(() => {
    page = new AuthAppPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
