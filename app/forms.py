from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField, \
    TextAreaField, FileField, RadioField, IntegerField, SelectField
from wtforms.validators import ValidationError, DataRequired, Email, EqualTo, \
    Length
from flask_babel import _, lazy_gettext as _l
from app.models import User


class LoginForm(FlaskForm):
    username = StringField(_l('Username'), validators=[DataRequired()])
    password = PasswordField(_l('Password'), validators=[DataRequired()])
    remember_me = BooleanField(_l('Remember Me'))
    submit = SubmitField(_l('Sign In'))

class zhLoginForm(FlaskForm):
    username = StringField(_l('用戶名'), validators=[DataRequired()])
    password = PasswordField(_l('密碼'), validators=[DataRequired()])
    remember_me = BooleanField(_l('記住我'))
    submit = SubmitField(_l('登入'))

class RegistrationForm(FlaskForm):
    username = StringField(_l('Username'), validators=[DataRequired()])
    email = StringField(_l('Email'), validators=[DataRequired(), Email()])
    password = PasswordField(_l('Password'), validators=[DataRequired()])
    password2 = PasswordField(
        _l('Repeat Password'), validators=[DataRequired(),
                                           EqualTo('password')])
    submit = SubmitField(_l('Register'))

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError(_('Please use a different username.'))

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError(_('Please use a different email address.'))

class zhRegistrationForm(FlaskForm):
    username = StringField(_l('用戶名'), validators=[DataRequired()])
    email = StringField(_l('電子郵件'), validators=[DataRequired(), Email()])
    password = PasswordField(_l('密碼'), validators=[DataRequired()])
    password2 = PasswordField(
        _l('重複密碼'), validators=[DataRequired(),
                                   EqualTo('password')])
    submit = SubmitField(_l('註冊'))

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError(_('Please use a different username.'))

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError(_('Please use a different email address.'))



class ResetPasswordRequestForm(FlaskForm):
    email = StringField(_l('Email'), validators=[DataRequired(), Email()])
    submit = SubmitField(_l('Request Password Reset'))

class zhResetPasswordRequestForm(FlaskForm):
    email = StringField(_l('電子郵件'), validators=[DataRequired(), Email()])
    submit = SubmitField(_l('請求重設密碼'))



class ResetPasswordForm(FlaskForm):
    password = PasswordField(_l('Password'), validators=[DataRequired()])
    password2 = PasswordField(
        _l('Repeat Password'), validators=[DataRequired(),
                                           EqualTo('password')])
    submit = SubmitField(_l('Request Password Reset'))

class zhResetPasswordForm(FlaskForm):
    password = PasswordField(_l('密碼'), validators=[DataRequired()])
    password2 = PasswordField(
        _l('重複密碼'), validators=[DataRequired(),
                                   EqualTo('password')])
    submit = SubmitField(_l('請求重設密碼'))


class EditProfileForm(FlaskForm):
    username = StringField(_l('Username'), validators=[DataRequired()])
    about_me = TextAreaField(_l('About me'),
                             validators=[Length(min=0, max=140)])
    submit = SubmitField(_l('Submit'))

    def __init__(self, original_username, *args, **kwargs):
        super(EditProfileForm, self).__init__(*args, **kwargs)
        self.original_username = original_username

    def validate_username(self, username):
        if username.data != self.original_username:
            user = User.query.filter_by(username=self.username.data).first()
            if user is not None:
                raise ValidationError(_('Please use a different username.'))

class zhEditProfileForm(FlaskForm):
    username = StringField(_l('用戶名'), validators=[DataRequired()])
    about_me = TextAreaField(_l('關於我'),
                             validators=[Length(min=0, max=140)])
    submit = SubmitField(_l('提交'))

    def __init__(self, original_username, *args, **kwargs):
        super(zhEditProfileForm, self).__init__(*args, **kwargs)
        self.original_username = original_username

    def validate_username(self, username):
        if username.data != self.original_username:
            user = User.query.filter_by(username=self.username.data).first()
            if user is not None:
                raise ValidationError(_('請使用不同的用戶名。'))


class PostForm(FlaskForm):
    post = TextAreaField(_l('Ask'), validators=[DataRequired()])
    submit = SubmitField(_l('Send'))

class ImageForm(FlaskForm):
    image = FileField(_l('Image'), validators=[DataRequired()])
    submit = SubmitField(_l('Submit'))

class AddBrandForm(FlaskForm):
    brandname = StringField(_l('Brand'), validators=[DataRequired()])
    submit = SubmitField(_l('Add Brand'))

class AddCategoryForm(FlaskForm):
    categoryname = StringField(_l('Category'), validators=[DataRequired()])
    submit = SubmitField(_l('Add Brand'))

class AddProductForm(FlaskForm):
    productname = StringField(_l('Product'), validators=[DataRequired()])
    price = IntegerField(_l('Price'),validators=[DataRequired()])
    description = TextAreaField(_l('Description'),validators=[Length(min=0, max=140)])
    submit = SubmitField(_l('Add Product'))

class AddAreaForm(FlaskForm):
    areaname = StringField(_l('Area'), validators=[DataRequired()])
    submit = SubmitField(_l('Add Area'))

class AddDistricForm(FlaskForm):
    districname = StringField(_l('Distric'), validators=[DataRequired()])
    submit = SubmitField(_l('Add Distric'))

class AddMTRForm(FlaskForm):
    mtrname = StringField(_l('MTR'), validators=[DataRequired()])
    submit = SubmitField(_l('Add MTR'))

class AddConditionForm(FlaskForm):
    conditionname = StringField(_l('Condition'), validators=[DataRequired()])
    submit = SubmitField(_l('Add Condition'))

class AddMeetupForm(FlaskForm):
    meetupname = StringField(_l('Meetup'), validators=[DataRequired()])
    submit = SubmitField(_l('Add Meetup'))