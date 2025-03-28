from datetime import datetime
from flask import render_template, jsonify, flash, redirect, url_for, request, g, session
import requests
from flask_login import login_user, logout_user, current_user, login_required
from urllib.parse import urlparse
from werkzeug.utils import secure_filename
from flask_babel import _, get_locale
from app import app, db, client
from app.forms import zhLoginForm, LoginForm, RegistrationForm, zhRegistrationForm, EditProfileForm, zhEditProfileForm, PostForm, AddAreaForm, AddDistricForm,AddMTRForm, \
    ResetPasswordRequestForm, zhResetPasswordRequestForm, ResetPasswordForm, zhResetPasswordForm, ImageForm, AddProductForm,AddCategoryForm,AddBrandForm,AddMeetupForm,AddConditionForm
from app.models import User, Post, Image, Product,Category,Brand,Area,Distric,MTR,Meetup,Condition
from app.email import send_password_reset_email
from werkzeug.utils import secure_filename
import json
import xml.etree.ElementTree as ET
import logging

@app.route('/privacy_policy')
def privacy_policy():
    return render_template('privacy_policy.html.j2')

def is_chinese(text):
    return any('\u4e00' <= char <= '\u9fff' for char in text)

@app.route('/send_message', methods=['POST'])
def send_message():
    data = request.get_json()
    message = data.get('message')
    mode = data.get('mode', 'normal')  # Default mode is 'normal'

    # Default prompt with instructions for handling car park queries
    default_prompt = (
        "You have access to the Ease Park Hong Kong car park information API. You are not a programming language AI maker, don't include programming language in responses to users. Here are the key endpoints and their purposes:\n"
        "1. https://api.data.gov.hk/v1/carpark-info-vacancy: Provides information on car park names.\n"
        "2. https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US: Provides real-time vacancy information for private cars, motorcycles, LGVs, HGVs, and coaches.\n"
        "Note: These endpoints use 'park_Id' to connect car park names with their respective vacancy data.\n"
        "When a user provides a car park name, you should:\n"
        "1. Search for the park ID using the car park name in the endpoint: https://api.data.gov.hk/v1/carpark-info-vacancy.\n"
        "2. Use the park ID to retrieve live vacancy information from the endpoint: https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US.\n"
        "3. Extract and present the vacancy information for private cars, motorcycles, LGVs, HGVs, and coaches.\n"
        "Example Response: 'Vacancy information for 山頂廣場 (The Peak Galleria): Private Cars: 24 spaces available out of 45 total. Motorcycles: 1 space available out of 1 total. LGVs: 0 spaces available out of 0 total. HGVs: 0 spaces available out of 0 total. Coaches: 0 spaces available out of 0 total.'\n"
        "If the user requests additional information about the car park from https://resource.data.one.gov.hk/td/carpark/basic_info_all.json, you should:\n"
        "1. Fetch the car park details from the provided JSON endpoint.\n"
        "2. Extract and present the requested information (e.g., website, contact number, address, etc.).\n"
        "Example Response: 'Information for 天晴邨第一期停車場 (Phase 1 Carpark of Tin Ching Estate): Website: [website_en]'\n"
        "If the exact car park name cannot be found, respond with '[[NOT FOUND]]' followed by a list of the 5 most similar car park names for the user to choose from.\n"
        "Example Response: '[[NOT FOUND]] The car park name you provided could not be found. Here are 5 similar car park names: 1. 天晴邨第一期停車場, 2. 天晴邨第二期停車場, 3. 天晴邨第三期停車場, 4. 天晴邨第四期停車場, 5. 天晴邨第五期停車場.'\n"
        "Ensure the final response contains information for private cars, motorcycles, LGVs, HGVs, coaches when applicable.\n"
        "Please ensure the response is clear, concise, and formatted in a user-friendly manner.\n"
    )

    if not message:
        return jsonify({'error': 'No message provided'}), 400

    try:
        # Handle car park mode
        if mode == 'car_park':
            # Check if it's a simple car park query
            query_prompt = f"這只是在查詢單一個停車場的空缺或資訊的嗎？,只是回應(是)或(否)\: {message}"
            query_response = client.models.generate_content(
                model="gemini-2.0-flash", contents=query_prompt
            )

            if '是' in query_response.text:
                # Select car park info source based on language
                if is_chinese(message):
                    response1 = requests.get('https://resource.data.one.gov.hk/td/carpark/basic_info_all.json')
                else:
                    response1 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
                data1 = response1.json()

                # Fetch vacancy info
                response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
                data2 = response2.json()

                # Combine data for the AI
                combined_data = {
                    'carpark_info': data1,
                    'vacancy_info': data2
                }
                prompt = f"{default_prompt}\nMessage: {message}\nCarpark Info: {combined_data}"

                # Retry loop for generating response (max 5 attempts)
                max_attempts = 5
                for attempt in range(max_attempts):
                    # Generate initial response
                    response = client.models.generate_content(
                        model="gemini-2.0-flash", contents=prompt
                    )
                    initial_response = response.text

                    # Check if car park was not found
                    if "[[NOT FOUND]]" in initial_response:
                        final_response_text = initial_response.replace("[[NOT FOUND]]", "此停車場未找到關鍵字。")
                        break  # Exit loop if we get a valid "not found" response
                    else:
                        # Refine the response
                        refinement_prompt = (
                            "Please refine the following response to only include the necessary vacancy and data information for the user:\n"
                            "You are not a programming language maker, delete all programming language, only keep user need data\n"
                            f"{initial_response}"
                        )
                        refinement_response = client.models.generate_content(
                            model="gemini-2.0-flash", contents=refinement_prompt
                        )
                        final_response_text = refinement_response.text

                        # Break if response is not "(undefined)"
                        if final_response_text.strip() != "(undefined)":
                            break
                        else:
                            logging.warning(f"Attempt {attempt + 1}/{max_attempts}: Response was '(undefined)', retrying...")
                            if attempt == max_attempts - 1:
                                # After max attempts, generate similar car parks
                                similarity_prompt = (
                                    f"根據以下停車場名稱 '{message}'，從以下數據中找到最多5個名稱相似或地理位置相近的停車場名稱，並以繁體中文列出:\n"
                                    f"Carpark Info: {data1}\n"
                                    "只需提供最多5個停車場名稱的編號列表，例如:\n"
                                    "1. 山頂廣場\n2. 山頂停車場\n3. 中環廣場\n4. 銅鑼灣停車場\n5. 尖沙咀碼頭停車場"
                                )
                                try:
                                    similarity_response = client.models.generate_content(
                                        model="gemini-2.0-flash", contents=similarity_prompt
                                    )
                                    similar_car_parks_text = similarity_response.text
                                except Exception as e:
                                    logging.error(f"Error generating similar car parks: {str(e)}")
                                    similar_car_parks_text = "未能生成相似的停車場列表。"
                                final_response_text = (
                                    "此停車場未找到關鍵字。以下是5個相似的停車場:\n"
                                    f"{similar_car_parks_text}"
                                )

                # Translate to Traditional Chinese if the user's message is in Chinese
                if is_chinese(message):
                    translation_prompt = (
                        "請將以下內容翻譯成繁體中文，並確保自然流暢且不讓使用者察覺是翻譯:\n"
                        f"{final_response_text}"
                    )
                    try:
                        translation_response = client.models.generate_content(
                            model="gemini-2.0-flash", contents=translation_prompt
                        )
                        final_response_text = translation_response.text
                    except Exception as e:
                        logging.error(f"Error translating response: {str(e)}")
                        # Keep original response if translation fails

                return jsonify({'reply': final_response_text})
            else:
                # Handle non-simple car park queries
                prompt_message = f"{default_prompt} {message}"
        else:
            # Handle non-car_park mode
            prompt_message = message

        # Generate response for non-car_park mode or complex queries
        response = client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt_message
        )
        final_response_text = response.text

        # Translate to Traditional Chinese if the user's message is in Chinese
        if is_chinese(message):
            translation_prompt = (
                "請將以下內容翻譯成繁體中文，並確保自然流暢且不讓使用者察覺是翻譯:\n"
                f"{final_response_text}"
            )
            try:
                translation_response = client.models.generate_content(
                    model="gemini-2.0-flash", contents=translation_prompt
                )
                final_response_text = translation_response.text
            except Exception as e:
                logging.error(f"Error translating response: {str(e)}")
                # Keep original response if translation fails

        return jsonify({'reply': final_response_text})

    except Exception as e:
        logging.error(f"Error generating content: {str(e)}")
        return jsonify({'error': 'Failed to generate content'}), 500

@app.route('/zh/news')
def zh_news():
    urls = {
        "Temporary Road Closure": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Temporary_Road_Closure.xml",
        "Expressways": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Expressways.xml",
        "Prohibited Zone": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Prohibited_Zone.xml",
        "Special Traffic and Transport Arrangement": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Special_Traffic_and_Transport_Arrangement.xml",
        "Other Notices": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Other_Notices.xml",
        "有關臨時車速限制的最新通告":"https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Temporary_Speed_Limits.xml",
        "有關禁止上落客貨區的最新通告":"https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Clearways.xml",
        "有關公共交通服務的最新通告":"https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Public_Transports.xml",
        "特別交通及運輸措施":"https://www.td.gov.hk/datagovhk_tis/traffic-notices/Special_Traffic_and_Transport_Arrangement.xml"
    }

    selected_types = request.args.getlist('type')
    notices = []

    if not selected_types:
        selected_types = urls.keys()

    for notice_type in selected_types:
        url = urls.get(notice_type)
        if url:
            try:
                response = requests.get(url)
                response.raise_for_status()  # Raise an HTTPError for bad responses
                if 'application/xml' in response.headers.get('Content-Type', ''):
                    root = ET.fromstring(response.content)
                    for notice in root.findall('Notice'):
                        content_TC = notice.find('Content_TC').text
                        if '.pdf' not in content_TC:
                            notice_data = {
                                'Title_TC': notice.find('Title_TC').text,
                                'Content_TC': content_TC
                            }
                            notices.append(notice_data)
                else:
                    logging.error(f"Unexpected content type from {url}: {response.headers.get('Content-Type')}")
            except requests.exceptions.RequestException as e:
                logging.error(f"Error fetching data from {url}: {e}")
            except ET.ParseError as e:
                logging.error(f"Error parsing XML from {url}: {e}")

    return render_template('zh.news.html.j2', notices=notices)

@app.route('/news')
def news():
    urls = {
        "Temporary Road Closure": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Temporary_Road_Closure.xml",
        "Expressways": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Expressways.xml",
        "Prohibited Zone": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Prohibited_Zone.xml",
        "Special Traffic and Transport Arrangement": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Special_Traffic_and_Transport_Arrangement.xml",
        "Other Notices": "https://www.td.gov.hk/datagovhk_tis/traffic-notices/Other_Notices.xml",
        "有關臨時車速限制的最新通告":"https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Temporary_Speed_Limits.xml",
        "有關禁止上落客貨區的最新通告":"https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Clearways.xml",
        "有關公共交通服務的最新通告":"https://www.td.gov.hk/datagovhk_tis/traffic-notices/Notices_on_Public_Transports.xml",
        "特別交通及運輸措施":"https://www.td.gov.hk/datagovhk_tis/traffic-notices/Special_Traffic_and_Transport_Arrangement.xml"
    }

    selected_types = request.args.getlist('type')
    notices = []

    if not selected_types:
        selected_types = urls.keys()

    for notice_type in selected_types:
        url = urls.get(notice_type)
        if url:
            try:
                response = requests.get(url)
                response.raise_for_status()  # Raise an HTTPError for bad responses
                if 'application/xml' in response.headers.get('Content-Type', ''):
                    root = ET.fromstring(response.content)
                    for notice in root.findall('Notice'):
                        content_en = notice.find('Content_EN').text
                        if '.pdf' not in content_en:
                            notice_data = {
                                'Title_EN': notice.find('Title_EN').text,
                                'Content_EN': content_en
                            }
                            notices.append(notice_data)
                else:
                    logging.error(f"Unexpected content type from {url}: {response.headers.get('Content-Type')}")
            except requests.exceptions.RequestException as e:
                logging.error(f"Error fetching data from {url}: {e}")
            except ET.ParseError as e:
                logging.error(f"Error parsing XML from {url}: {e}")

    return render_template('news.html.j2', notices=notices)

@app.route('/camera')
def camera():
    response = requests.get('https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.xml')
    tree = ET.ElementTree(ET.fromstring(response.content))
    root = tree.getroot()

    cameras = []
    for image in root.findall('image'):
        camera = {
            'key': image.find('key').text,
            'region': image.find('region').text,
            'district': image.find('district').text,
            'description': image.find('description').text,
            'latitude': image.find('latitude').text,
            'longitude': image.find('longitude').text,
            'url': image.find('url').text
        }
        cameras.append(camera)

    return render_template('camera.html.j2', cameras=cameras)

@app.route('/zh/camera')
def zh_camera():
    response = requests.get('https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_Tc.xml')
    tree = ET.ElementTree(ET.fromstring(response.content))
    root = tree.getroot()

    cameras = []
    for image in root.findall('image'):
        camera = {
            'key': image.find('key').text,
            'region': image.find('region').text,
            'district': image.find('district').text,
            'description': image.find('description').text,
            'latitude': image.find('latitude').text,
            'longitude': image.find('longitude').text,
            'url': image.find('url').text
        }
        cameras.append(camera)

    return render_template('zh.camera.html.j2', cameras=cameras)

@app.before_request
def before_request():
    if current_user.is_authenticated:
        current_user.last_seen = datetime.utcnow()
        db.session.commit()
    g.locale = str(get_locale())

@app.route('/ai-chatbox')
def ai_chatbox():
    return render_template('ai-chatbox.html.j2')

@app.route('/')
def index():
    response1 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
    data1 = response1.json()
    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
    data2 = response2.json()

    # Create a dictionary to map park_Id to vacancy information for each vehicle type
    vacancy_info = {}
    for item in data2['results']:
        park_id = item['park_Id']
        vacancy_info[park_id] = {
            'privateCar': item.get('privateCar', [{}])[0],
            'motorCycle': item.get('motorCycle', [{}])[0],
            'LGV': item.get('LGV', [{}])[0],
            'HGV': item.get('HGV', [{}])[0],
            'coach': item.get('coach', [{}])[0]
        }

    # Combine the data by adding vacancy information to the car park data
    for carpark in data1['results']:
        park_id = carpark['park_Id']
        if park_id in vacancy_info:
            for vehicle_type in ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach']:
                if vehicle_type in vacancy_info[park_id]:
                    carpark[f'{vehicle_type}_vacancy'] = vacancy_info[park_id][vehicle_type].get('vacancy', 'N/A')
                    carpark[f'{vehicle_type}_vacancy_type'] = vacancy_info[park_id][vehicle_type].get('vacancy_type', '')

        # Example: Check for hourly charges for private cars
        if 'privateCar' in carpark and 'hourlyCharges' in carpark['privateCar']:
            carpark['price'] = carpark['privateCar']['hourlyCharges'][0]['price']
        else:
            carpark['price'] = 'N/A'

    # Separate favorite carparks from others
    favorite_carparks = session.get('favorite_carparks', [])
    favorite_carparks_data = [carpark for carpark in data1['results'] if carpark['park_Id'] in favorite_carparks]
    other_carparks_data = [carpark for carpark in data1['results'] if carpark['park_Id'] not in favorite_carparks]

    return render_template('index.html.j2', favorite_carparks=favorite_carparks_data, carparks=other_carparks_data)

@app.route('/toggle_favorite/<park_id>', methods=['POST'])
def toggle_favorite(park_id):
    if 'favorite_carparks' not in session:
        session['favorite_carparks'] = []

    favorite_carparks = session['favorite_carparks']

    if park_id in favorite_carparks:
        favorite_carparks.remove(park_id)
    else:
        favorite_carparks.append(park_id)

    session['favorite_carparks'] = favorite_carparks
    return jsonify(success=True)

@app.route('/zh')
@app.route('/zh<path:path>')
def zh(path=''):
    response1 = requests.get('https://resource.data.one.gov.hk/td/carpark/basic_info_all.json')
    data1 = response1.content.decode('utf-8-sig')
    data1 = json.loads(data1)

    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
    data2 = response2.json()

    # Create a dictionary to map park_Id to vacancy information for each vehicle type
    vacancy_info = {}
    if 'results' in data2:
        for item in data2['results']:
            park_id = item['park_Id']
            vacancy_info[park_id] = {
                'privateCar': item.get('privateCar', [{}])[0],
                'motorCycle': item.get('motorCycle', [{}])[0],
                'LGV': item.get('LGV', [{}])[0],
                'HGV': item.get('HGV', [{}])[0],
                'coach': item.get('coach', [{}])[0]
            }

    # Combine the data by adding vacancy information to the car park data
    for carpark in data1['car_park']:
        park_id = carpark['park_id']
        if park_id in vacancy_info:
            for vehicle_type in ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach']:
                if vehicle_type in vacancy_info[park_id]:
                    carpark[f'{vehicle_type}_vacancy'] = vacancy_info[park_id][vehicle_type].get('vacancy', 'N/A')
                    carpark[f'{vehicle_type}_vacancy_type'] = vacancy_info[park_id][vehicle_type].get('vacancy_type', '')

    # Separate favorite carparks from others
    favorite_carparks = session.get('favorite_carparks', [])
    favorite_carparks_data = [carpark for carpark in data1['car_park'] if carpark['park_id'] in favorite_carparks]
    other_carparks_data = [carpark for carpark in data1['car_park'] if carpark['park_id'] not in favorite_carparks]

    return render_template('zh.html.j2', favorite_carparks=favorite_carparks_data, carparks=other_carparks_data)

@app.template_filter('translate_status')
def translate_status(status):
    translations = {
        'NONE': '未提供',
        'none': '未提供',
        'OPEN': '營業中',
        'open': '營業中',
        'None': '未提供',
        'CLOSED': '非營業',
        'closed': '非營業'

    }
    normalized_status = str(status).lower()
    return translations.get(normalized_status, '未提供')

@app.route('/carparkinfo/<district>')
def carparkinfo(district):
    response1 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
    data1 = response1.json()
    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
    data2 = response2.json()

    # Filter carparks by district
    carparks = [cp for cp in data1['results'] if cp['district'] == district]

    # Create a dictionary to map park_Id to vacancy information for each vehicle type
    vacancy_info = {}
    for item in data2['results']:
        park_id = item['park_Id']
        vacancy_info[park_id] = {
            'privateCar': item.get('privateCar', [{}])[0],
            'motorCycle': item.get('motorCycle', [{}])[0],
            'LGV': item.get('LGV', [{}])[0],
            'HGV': item.get('HGV', [{}])[0],
            'coach': item.get('coach', [{}])[0]
        }

    # Combine the data by adding vacancy information to the car park data
    for carpark in carparks:
        park_id = carpark['park_Id']
        if park_id in vacancy_info:
            for vehicle_type in ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach']:
                if vehicle_type in vacancy_info[park_id]:
                    carpark[f'{vehicle_type}_vacancy'] = vacancy_info[park_id][vehicle_type].get('vacancy', 'N/A')
                    carpark[f'{vehicle_type}_vacancy_type'] = vacancy_info[park_id][vehicle_type].get('vacancy_type', '')

    # Render the template with filtered carparks
    return render_template('carparkinfo.html.j2', carparks=carparks, district=district)

@app.route('/zh/carparkinfo/<district>')
def zh_carparkinfo(district):
    response1 = requests.get('https://resource.data.one.gov.hk/td/carpark/basic_info_all.json')
    data1 = response1.content.decode('utf-8-sig')
    data1 = json.loads(data1)

    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
    data2 = response2.content.decode('utf-8-sig')
    data2 = json.loads(data2)

    # Filter carparks by district
    carparks = [cp for cp in data1['car_park'] if cp['district_en'] == district]

    # Create a dictionary to map park_Id to vacancy information for each vehicle type
    vacancy_info = {}
    for item in data2['results']:
        park_id = item['park_Id']
        vacancy_info[park_id] = {
            'privateCar': item.get('privateCar', [{}])[0],
            'motorCycle': item.get('motorCycle', [{}])[0],
            'LGV': item.get('LGV', [{}])[0],
            'HGV': item.get('HGV', [{}])[0],
            'coach': item.get('coach', [{}])[0]
        }

    # Combine the data by adding vacancy information to the car park data
    for carpark in carparks:
        park_id = carpark['park_id']
        if park_id in vacancy_info:
            for vehicle_type in ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach']:
                if vehicle_type in vacancy_info[park_id]:
                    carpark[f'{vehicle_type}_vacancy'] = vacancy_info[park_id][vehicle_type].get('vacancy', 'N/A')
                    carpark[f'{vehicle_type}_vacancy_type'] = vacancy_info[park_id][vehicle_type].get('vacancy_type', '')

    # Get the Chinese district name
    district_tc = carparks[0]['district_tc'] if carparks else district

    # Render the template with filtered carparks
    return render_template('zh.carparkinfo.html.j2', carparks=carparks, district_tc=district_tc)

@app.route('/carparkinfo')
def carpark_info():
    carparks = get_carpark_data()  # 確保這裡返回的是一個包含 carpark 對象的列表
    print(carparks)  # 調試輸出
    return render_template('carparkinfo.html.j2', carparks=carparks, district='Your District')
    url = 'https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar&lang=en_US'
    response = requests.get(url)
    data = response.json()

    # Find park with ID "12" and extract required information
    park_info = next((park for park in data['results'] if park['park_Id'] == "12"), None)

    if not park_info:
        return "Park ID not found", 404

    # Prepare data for rendering
    private_car = park_info['privateCar'][0]
    lgv = park_info['LGV'][0]
    hgv = park_info['HGV'][0]
    motorcycle = park_info['motorCycle'][0]

    vacancy_data = [
        {'type': 'Private Car', 'vacancy': private_car['vacancy'], 'last_update': private_car['lastupdate']},
        {'type': 'Large Goods Vehicle', 'vacancy': lgv['vacancy'], 'last_update': lgv['lastupdate']},
        {'type': 'Heavy Goods Vehicle', 'vacancy': hgv['vacancy'], 'last_update': hgv['lastupdate']},
        {'type': 'Motor Cycle', 'vacancy': motorcycle['vacancy'], 'last_update': motorcycle['lastupdate']}
    ]

    return render_template('『carparkinfo_map.html.j2', vacancy_data=vacancy_data)

@app.route('/carpark/<park_id>')
def carpark_detail(park_id):
    response1 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
    data1 = response1.json()
    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&lang=en_US')
    data2 = response2.json()

    # Find specific car park
    carpark = next((cp for cp in data1['results'] if cp['park_Id'] == park_id), None)

    # Collect vacancy information for all vehicle types
    vacancy_info = {item['park_Id']: item for item in data2['results']}

    # Combine the data by adding vacancy information to the car park data
    if carpark:
        pid = carpark['park_Id']
        if pid in vacancy_info:
            carpark_vacancies = []
            vehicle_type_names = {
                'privateCar': 'Private Car',
                'LGV': 'Large Goods Vehicle',
                'HGV': 'Heavy Goods Vehicle',
                'motorCycle': 'Motor Cycle',
                'coach': 'Coach'
            }
            for vehicle_type, details in vacancy_info[pid].items():
                if isinstance(details, list):
                    for detail in details:
                        carpark_vacancies.append({
                            'type': vehicle_type_names.get(vehicle_type, vehicle_type),
                            'vacancy': detail['vacancy'],
                            'last_update': detail['lastupdate']
                        })
            carpark['vacancy_data'] = carpark_vacancies

        # Assuming there's a structure for 'privateCar' with 'hourlyCharges'
        if 'privateCar' in carpark and 'hourlyCharges' in carpark['privateCar']:
            carpark['price'] = carpark['privateCar']['hourlyCharges'][0]['price']
        else:
            carpark['price'] = 'N/A'

        # Render the specific car park details to the template
        return render_template('carpark_detail.html.j2', carpark=carpark)
    else:
        return "Carpark not found", 404

@app.route('/zh/carpark/<park_id>')
def zh_carpark_detail(park_id):
    response1 = requests.get('https://resource.data.one.gov.hk/td/carpark/basic_info_all.json')
    data1 = response1.content.decode('utf-8-sig')
    data1 = json.loads(data1)
    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&lang=en_US')
    data2 = response2.json()

    # Find specific car park
    carpark = next((cp for cp in data1['car_park'] if cp['park_id'] == park_id), None)

    # Collect vacancy information for all vehicle types
    vacancy_info = {item['park_Id']: item for item in data2['results']}

    # Combine the data by adding vacancy information to the car park data
    if carpark:
        pid = carpark['park_id']
        if pid in vacancy_info:
            carpark_vacancies = []
            vehicle_type_names = {
                'privateCar': '私家車',
                'LGV': '大型貨車',
                'HGV': '重型貨車',
                'motorCycle': '摩托車',
                'coach': '旅遊巴'
            }
            for vehicle_type, details in vacancy_info[pid].items():
                if isinstance(details, list):
                    for detail in details:
                        carpark_vacancies.append({
                            'type': vehicle_type_names.get(vehicle_type, vehicle_type),
                            'vacancy': detail.get('vacancy', 'N/A'),
                            'last_update': detail['lastupdate']
                        })
            carpark['vacancy_data'] = carpark_vacancies

        # Assuming there's a structure for 'privateCar' with 'hourlyCharges'
        if 'privateCar' in carpark and 'hourlyCharges' in carpark['privateCar']:
            carpark['price'] = carpark['privateCar']['hourlyCharges'][0]['price']
        else:
            carpark['price'] = 'N/A'

        # Render the specific car park details to the template
        return render_template('zh.carpark_detail.html.j2', carpark=carpark)
    else:
        return "Carpark not found", 404

if __name__ == '__main__':
    app.run(debug=True)

@app.route('/hong_kong_island')
def hong_kong_island():
    response1 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
    data1 = response1.json()
    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
    data2 = response2.json()

    # Create a dictionary to map park_Id to vacancy information for each vehicle type
    vacancy_info = {}
    for item in data2['results']:
        park_id = item['park_Id']
        vacancy_info[park_id] = {
            'privateCar_vacancy': item['privateCar'][0]['vacancy'] if 'privateCar' in item else 'N/A',
            'motorCycle_vacancy': item['motorCycle'][0]['vacancy'] if 'motorCycle' in item else 'N/A',
            'LGV_vacancy': item['LGV'][0]['vacancy'] if 'LGV' in item else 'N/A',
            'HGV_vacancy': item['HGV'][0]['vacancy'] if 'HGV' in item else 'N/A',
            'coach_vacancy': item['coach'][0]['vacancy'] if 'coach' in item else 'N/A'
        }

    # Filter carparks by districts in Hong Kong Island
    hk_island_districts = ['Central & Western', 'Wan Chai', 'Eastern', 'Southern']
    carparks = []
    for carpark in data1['results']:
        if carpark['district'] in hk_island_districts:
            park_id = carpark['park_Id']
            if park_id in vacancy_info:
                carpark.update(vacancy_info[park_id])
            carparks.append(carpark)

    return render_template('hong_kong_island.html.j2', carparks=carparks)
    response = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
    data = response.json()

    # Filter carparks by districts in Hong Kong Island
    hk_island_districts = ['Central & Western', 'Wan Chai', 'Eastern', 'Southern']
    carparks = [cp for cp in data['results'] if cp['district'] in hk_island_districts]

    return render_template('hong_kong_island.html.j2', carparks=carparks)

@app.route('/zh/hong_kong_island')
def zh_hong_kong_island():
    response1 = requests.get('https://resource.data.one.gov.hk/td/carpark/basic_info_all.json')
    data1 = response1.content.decode('utf-8-sig')
    data1 = json.loads(data1)

    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
    data2 = response2.json()

    # Create a dictionary to map park_Id to vacancy information for each vehicle type
    vacancy_info = {}
    if 'results' in data2:
        for item in data2['results']:
            park_id = item['park_Id']
            vacancy_info[park_id] = {
                'privateCar': item.get('privateCar', [{}])[0],
                'motorCycle': item.get('motorCycle', [{}])[0],
                'LGV': item.get('LGV', [{}])[0],
                'HGV': item.get('HGV', [{}])[0],
                'coach': item.get('coach', [{}])[0]
            }

    # Filter carparks by districts in Hong Kong Island
    hk_island_districts = ['Central & Western', 'Wan Chai', 'Eastern', 'Southern']
    carparks = []
    for carpark in data1['car_park']:
        if carpark.get('district_en') in hk_island_districts:
            park_id = carpark['park_id']
            if park_id in vacancy_info:
                for vehicle_type in ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach']:
                    if vehicle_type in vacancy_info[park_id]:
                        carpark[f'{vehicle_type}_vacancy'] = vacancy_info[park_id][vehicle_type].get('vacancy', 'N/A')
                        carpark[f'{vehicle_type}_vacancy_type'] = vacancy_info[park_id][vehicle_type].get('vacancy_type', '')
            carparks.append(carpark)

    return render_template('zh.hong_kong_island.html.j2', carparks=carparks)


@app.route('/kowloon')
def kowloon():
    response1 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
    data1 = response1.json()
    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
    data2 = response2.json()

    # Create a dictionary to map park_Id to vacancy information for each vehicle type
    vacancy_info = {}
    for item in data2['results']:
        park_id = item['park_Id']
        vacancy_info[park_id] = {
            'privateCar_vacancy': item['privateCar'][0]['vacancy'] if 'privateCar' in item else 'N/A',
            'motorCycle_vacancy': item['motorCycle'][0]['vacancy'] if 'motorCycle' in item else 'N/A',
            'LGV_vacancy': item['LGV'][0]['vacancy'] if 'LGV' in item else 'N/A',
            'HGV_vacancy': item['HGV'][0]['vacancy'] if 'HGV' in item else 'N/A',
            'coach_vacancy': item['coach'][0]['vacancy'] if 'coach' in item else 'N/A'
        }

    # Filter carparks by districts in kowloon
    kowloon_districts = ['Yau Tsim Mong', 'Sham Shui Po', 'Kowloon City', 'Wong Tai Sin', 'Kwun Tong']
    carparks = []
    for carpark in data1['results']:
        if carpark['district'] in kowloon_districts:
            park_id = carpark['park_Id']
            if park_id in vacancy_info:
                carpark.update(vacancy_info[park_id])
            carparks.append(carpark)

    return render_template('kowloon.html.j2', carparks=carparks)
    response = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
    data = response.json()

    # Filter carparks by districts in kowloon
    kowloon_districts = ['Yau Tsim Mong', 'Sham Shui Po', 'Kowloon City', 'Wong Tai Sin', 'Kwun Tong']
    carparks = [cp for cp in data['results'] if cp['district'] in kowloon_districts]

    return render_template('kowloon.html.j2', carparks=carparks)

@app.route('/zh/kowloon')
def zh_kowloon():
    response1 = requests.get('https://resource.data.one.gov.hk/td/carpark/basic_info_all.json')
    data1 = response1.content.decode('utf-8-sig')
    data1 = json.loads(data1)

    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
    data2 = response2.json()

    # Create a dictionary to map park_Id to vacancy information for each vehicle type
    vacancy_info = {}
    if 'results' in data2:
        for item in data2['results']:
            park_id = item['park_Id']
            vacancy_info[park_id] = {
                'privateCar': item.get('privateCar', [{}])[0],
                'motorCycle': item.get('motorCycle', [{}])[0],
                'LGV': item.get('LGV', [{}])[0],
                'HGV': item.get('HGV', [{}])[0],
                'coach': item.get('coach', [{}])[0]
            }

    # Filter carparks by districts in Kowloon
    kowloon_districts = ['Yau Tsim Mong', 'Sham Shui Po', 'Kowloon City', 'Wong Tai Sin', 'Kwun Tong']
    carparks = []
    for carpark in data1['car_park']:
        if carpark.get('district_en') in kowloon_districts:
            park_id = carpark['park_id']
            if park_id in vacancy_info:
                for vehicle_type in ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach']:
                    if vehicle_type in vacancy_info[park_id]:
                        carpark[f'{vehicle_type}_vacancy'] = vacancy_info[park_id][vehicle_type].get('vacancy', 'N/A')
                        carpark[f'{vehicle_type}_vacancy_type'] = vacancy_info[park_id][vehicle_type].get('vacancy_type', '')
            carparks.append(carpark)

    # Log the carparks data for debugging
    for carpark in carparks:
        app.logger.debug(f"Carpark ID: {carpark.get('park_id')}, Name: {carpark.get('name')}, Address: {carpark.get('displayAddress')}")

    return render_template('zh.kowloon.html.j2', carparks=carparks)

@app.route('/new_territories')
def new_territories():
    response1 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
    data1 = response1.json()
    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
    data2 = response2.json()

    # Create a dictionary to map park_Id to vacancy information for each vehicle type
    vacancy_info = {}
    for item in data2['results']:
        park_id = item['park_Id']
        vacancy_info[park_id] = {
            'privateCar_vacancy': item['privateCar'][0]['vacancy'] if 'privateCar' in item else 'N/A',
            'motorCycle_vacancy': item['motorCycle'][0]['vacancy'] if 'motorCycle' in item else 'N/A',
            'LGV_vacancy': item['LGV'][0]['vacancy'] if 'LGV' in item else 'N/A',
            'HGV_vacancy': item['HGV'][0]['vacancy'] if 'HGV' in item else 'N/A',
            'coach_vacancy': item['coach'][0]['vacancy'] if 'coach' in item else 'N/A'
        }

    # Filter carparks by districts in new_territories
    new_territories_districts = ['Kwai Tsing', 'Tsuen Wan', 'Yuen Long', 'Tuen Mun', 'North', 'Tai Po', 'Sha Tin', 'Sai Kung', 'Islands']
    carparks = []
    for carpark in data1['results']:
        if carpark['district'] in new_territories_districts:
            park_id = carpark['park_Id']
            if park_id in vacancy_info:
                carpark.update(vacancy_info[park_id])
            carparks.append(carpark)

    return render_template('new_territories.html.j2', carparks=carparks)
    response = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
    data = response.json()

    # Filter carparks by districts in kowloon
    kowloon_districts = ['Kwai Tsing', 'Tsuen Wan', 'Yuen Long', 'Tuen Mun', 'North', 'Tai Po', 'Sha Tin', 'Sai Kung', 'Islands']
    carparks = [cp for cp in data['results'] if cp['district'] in new_territories_districts]

    return render_template('new_territories.j2', carparks=carparks)

@app.route('/zh/new_territories')
def zh_new_territories():
    response1 = requests.get('https://resource.data.one.gov.hk/td/carpark/basic_info_all.json')
    data1 = response1.content.decode('utf-8-sig')
    data1 = json.loads(data1)

    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
    data2 = response2.json()

    # Create a dictionary to map park_Id to vacancy information for each vehicle type
    vacancy_info = {}
    if 'results' in data2:
        for item in data2['results']:
            park_id = item['park_Id']
            vacancy_info[park_id] = {
                'privateCar': item.get('privateCar', [{}])[0],
                'motorCycle': item.get('motorCycle', [{}])[0],
                'LGV': item.get('LGV', [{}])[0],
                'HGV': item.get('HGV', [{}])[0],
                'coach': item.get('coach', [{}])[0]
            }

    # Filter carparks by districts in New Territories
    new_territories_districts = ['Islands', 'Kwai Tsing', 'North', 'Sai Kung', 'Sha Tin', 'Tai Po', 'Tsuen Wan', 'Tuen Mun', 'Yuen Long']
    carparks = []
    for carpark in data1['car_park']:
        if carpark.get('district_en') in new_territories_districts:
            park_id = carpark['park_id']
            if park_id in vacancy_info:
                for vehicle_type in ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach']:
                    if vehicle_type in vacancy_info[park_id]:
                        carpark[f'{vehicle_type}_vacancy'] = vacancy_info[park_id][vehicle_type].get('vacancy', 'N/A')
                        carpark[f'{vehicle_type}_vacancy_type'] = vacancy_info[park_id][vehicle_type].get('vacancy_type', '')
            carparks.append(carpark)

    return render_template('zh.new_territories.html.j2', carparks=carparks)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user is None or not user.check_password(form.password.data):
            flash(_('Invalid username or password'))
            return redirect(url_for('login'))
        login_user(user, remember=form.remember_me.data)
        session['user_id'] = user.id
        next_page = request.args.get('next')
        if not next_page or urlparse(next_page).netloc != '':
            next_page = url_for('index')
        return redirect(next_page)
    return render_template('login.html.j2', title=_('Sign In'), form=form)

@app.route('/zh/login', methods=['GET', 'POST'])
def zh_login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = zhLoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user is None or not user.check_password(form.password.data):
            flash(_('Invalid username or password'))
            return redirect(url_for('login'))
        login_user(user, remember=form.remember_me.data)
        session['user_id'] = user.id
        next_page = request.args.get('next')
        if not next_page or urlparse(next_page).netloc != '':
            next_page = url_for('index')
        return redirect(next_page)
    return render_template('zh.login.html.j2', title=_('Sign In'), form=form)

@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, email=form.email.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash(_('Congratulations, you are now a registered user!'))
        return redirect(url_for('login'))
    return render_template('register.html.j2', title=_('Register'), form=form)

@app.route('/zh/register', methods=['GET', 'POST'])
def zh_register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = zhRegistrationForm()
    if form.validate_on_submit():
        existing_user = User.query.filter_by(email=form.email.data).first()
        if existing_user is None:
            user = User(username=form.username.data, email=form.email.data)
            user.set_password(form.password.data)
            db.session.add(user)
            db.session.commit()
            flash(_('Congratulations, you are now a registered user!'))
            return redirect(url_for('login'))
        else:
            flash(_('電子郵件地址已經註冊。'))
    return render_template('zh.register.html.j2', title=_('Register'), form=form)



@app.route('/reset_password_request', methods=['GET', 'POST'])
def reset_password_request():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = ResetPasswordRequestForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user:
            send_password_reset_email(user)
        flash(
            _('Check your email for the instructions to reset your password'))
        return redirect(url_for('login'))
    return render_template('reset_password_request.html.j2',
                           title=_('Reset Password'), form=form)

@app.route('/zh/reset_password_request', methods=['GET', 'POST'])
def zh_reset_password_request():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = zhResetPasswordRequestForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user:
            send_password_reset_email(user)
        flash(_('請檢查您的電子郵件以獲取重設密碼的指示'))
        return redirect(url_for('login'))
    return render_template('zh.reset_password_request.html.j2',
                           title=_('重設密碼'), form=form)


@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    user = User.verify_reset_password_token(token)
    if user is None:
        return redirect(url_for('index'))
    form = ResetPasswordForm()
    if form.validate_on_submit():
        user.set_password(form.password.data)
        db.session.commit()
        flash(_('Your password has been reset.'))
        return redirect(url_for('login'))
    return render_template('reset_password.html.j2', form=form)

@app.route('/zh/reset_password/<token>', methods=['GET', 'POST'])
def zh_reset_password(token):
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    user = User.verify_reset_password_token(token)
    if user is None:
        return redirect(url_for('index'))
    form = zhResetPasswordForm()
    if form.validate_on_submit():
        user.set_password(form.password.data)
        db.session.commit()
        flash(_('Your password has been reset.'))
        return redirect(url_for('login'))
    return render_template('zh.reset_password.html.j2', form=form)


@app.route('/user/<username>')
@login_required
def user(username):
    user = User.query.filter_by(username=username).first_or_404()
    page = request.args.get('page', 1, type=int)
    posts = user.followed_posts().paginate(
        page=page, per_page=app.config["POSTS_PER_PAGE"], error_out=False)
    next_url = url_for(
        'index', page=posts.next_num) if posts.next_num else None
    prev_url = url_for(
        'index', page=posts.prev_num) if posts.prev_num else None
    return render_template('user.html.j2', user=user, posts=posts.items,
                           next_url=next_url, prev_url=prev_url)

@app.route('/zh/user/<username>')
@login_required
def zh_user(username):
    user = User.query.filter_by(username=username).first_or_404()
    page = request.args.get('page', 1, type=int)
    posts = user.followed_posts().paginate(
        page=page, per_page=app.config["POSTS_PER_PAGE"], error_out=False)
    next_url = url_for(
        'index', page=posts.next_num) if posts.next_num else None
    prev_url = url_for(
        'index', page=posts.prev_num) if posts.prev_num else None
    return render_template('zh.user.html.j2', user=user, posts=posts.items,
                           next_url=next_url, prev_url=prev_url)


@app.route('/edit_profile', methods=['GET', 'POST'])
@login_required
def edit_profile():
    form = EditProfileForm(current_user.username)
    if form.validate_on_submit():
        current_user.username = form.username.data
        current_user.about_me = form.about_me.data
        db.session.commit()
        flash(_('Your changes have been saved.'))
        return redirect(url_for('edit_profile'))
    elif request.method == 'GET':
        form.username.data = current_user.username
        form.about_me.data = current_user.about_me
    return render_template('edit_profile.html.j2', title=_('Edit Profile'),
                           form=form)

@app.route('/zh/edit_profile', methods=['GET', 'POST'])
@login_required
def zh_edit_profile():
    form = zhEditProfileForm(current_user.username)
    if form.validate_on_submit():
        current_user.username = form.username.data
        current_user.about_me = form.about_me.data
        db.session.commit()
        flash(_('Your changes have been saved.'))
        return redirect(url_for('edit_profile'))
    elif request.method == 'GET':
        form.username.data = current_user.username
        form.about_me.data = current_user.about_me
    return render_template('zh.edit_profile.html.j2', title=_('Edit Profile'),
                           form=form)

@app.route('/result', methods=['GET'])
def result():
    query = request.args.get('p', '').lower()
    response1 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
    data1 = response1.json()
    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
    data2 = response2.json()

    # Create a dictionary to map park_Id to vacancy information for each vehicle type
    vacancy_info = {}
    for item in data2['results']:
        park_id = item['park_Id']
        vacancy_info[park_id] = {
            'privateCar': item.get('privateCar', [{}])[0],
            'motorCycle': item.get('motorCycle', [{}])[0],
            'LGV': item.get('LGV', [{}])[0],
            'HGV': item.get('HGV', [{}])[0],
            'coach': item.get('coach', [{}])[0]
        }

    # Combine the data by adding vacancy information to the car park data
    for carpark in data1['results']:
        park_id = carpark['park_Id']
        if park_id in vacancy_info:
            for vehicle_type in ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach']:
                if vehicle_type in vacancy_info[park_id]:
                    carpark[f'{vehicle_type}_vacancy'] = vacancy_info[park_id][vehicle_type].get('vacancy', 'N/A')
                    carpark[f'{vehicle_type}_vacancy_type'] = vacancy_info[park_id][vehicle_type].get('vacancy_type', '')

        # Example: Check for hourly charges for private cars
        if 'privateCar' in carpark and 'hourlyCharges' in carpark['privateCar']:
            carpark['price'] = carpark['privateCar']['hourlyCharges'][0]['price']
        else:
            carpark['price'] = 'N/A'

    # Filter carparks based on the search query
    if query:
        filtered_carparks = [carpark for carpark in data1['results'] if query in carpark['name'].lower()]
    else:
        filtered_carparks = data1['results']

    return render_template('index.html.j2', carparks=filtered_carparks, search_query=query)

    query = request.args.get('w', '').lower()
    response1 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
    data1 = response1.json()
    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
    data2 = response2.json()

    # Create a dictionary to map park_Id to vacancy information for each vehicle type
    vacancy_info = {}
    for item in data2['results']:
        park_id = item['park_Id']
        vacancy_info[park_id] = {
            'privateCar': item.get('privateCar', [{}])[0],
            'motorCycle': item.get('motorCycle', [{}])[0],
            'LGV': item.get('LGV', [{}])[0],
            'HGV': item.get('HGV', [{}])[0],
            'coach': item.get('coach', [{}])[0]
        }

    # Combine the data by adding vacancy information to the car park data
    for carpark in data1['results']:
        park_id = carpark['park_Id']
        if park_id in vacancy_info:
            for vehicle_type in ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach']:
                if vehicle_type in vacancy_info[park_id]:
                    carpark[f'{vehicle_type}_vacancy'] = vacancy_info[park_id][vehicle_type].get('vacancy', 'N/A')
                    carpark[f'{vehicle_type}_vacancy_type'] = vacancy_info[park_id][vehicle_type].get('vacancy_type', '')

        # Example: Check for hourly charges for private cars
        if 'privateCar' in carpark and 'hourlyCharges' in carpark['privateCar']:
            carpark['price'] = carpark['privateCar']['hourlyCharges'][0]['price']
        else:
            carpark['price'] = 'N/A'

    # Filter carparks based on the search query
    if query:
        filtered_carparks = [carpark for carpark in data1['results'] if query in carpark['name'].lower()]
    else:
        filtered_carparks = data1['results']

    return render_template('index.html.j2', carparks=filtered_carparks)

@app.route('/data1', methods=['GET'])
def data1():
    query = request.args.get('q', '').lower()
    response = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
    data = response.json()

    # Filter carparks based on the search query
    if query:
        suggestions = [carpark['name'] for carpark in data['results'] if query in carpark['name'].lower()]
    else:
        suggestions = []

    return jsonify(suggestions[:5])  # 只返回前5個建議

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('q', '').lower()
    response = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy')
    data = response.json()

    # Filter carparks based on the search query
    if query:
        results = [carpark for carpark in data['results'] if query in carpark['name'].lower()]
    else:
        results = []

    # 只返回前5個搜尋結果
    results = results[:5]

    return render_template('result.html.j2', carparks=results)

@app.route('/settings', methods=['GET', 'POST'])
def settings():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']

        current_user.username = username
        current_user.email = email
        db.session.commit()

        flash('Settings updated successfully', 'success')
        return redirect(url_for('settings'))

    return render_template('settings.html.j2')

@app.route('/zh/settings', methods=['GET', 'POST'])
def zh_settings():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']

        current_user.username = username
        current_user.email = email
        db.session.commit()

        flash('Settings updated successfully', 'success')
        return redirect(url_for('settings'))

    return render_template('zh.settings.html.j2')

@app.route('/change_language', methods=['POST'])
def change_language():
    language = request.form['language']
    session['language'] = language
    flash('Language changed successfully', 'success')
    return redirect(url_for('settings'))

@app.route('/zh/search', methods=['GET'])
def zh_search():
    query = request.args.get('w', '').lower()
    response1 = requests.get('https://resource.data.one.gov.hk/td/carpark/basic_info_all.json')
    data1 = response1.content.decode('utf-8-sig')
    data1 = json.loads(data1)

    response2 = requests.get('https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar,motorCycle,LGV,HGV,coach&lang=en_US')
    data2 = response2.json()

    # Create a dictionary to map park_Id to vacancy information for each vehicle type
    vacancy_info = {}
    if 'results' in data2:
        for item in data2['results']:
            park_id = item['park_Id']
            vacancy_info[park_id] = {
                'privateCar': item.get('privateCar', [{}])[0],
                'motorCycle': item.get('motorCycle', [{}])[0],
                'LGV': item.get('LGV', [{}])[0],
                'HGV': item.get('HGV', [{}])[0],
                'coach': item.get('coach', [{}])[0]
            }

    # Combine the data by adding vacancy information to the car park data
    if query:
        results = [carpark for carpark in data1['car_park'] if query in carpark['name_tc'].lower()]
    else:
        results = []

    for carpark in results:
        park_id = carpark['park_id']
        if park_id in vacancy_info:
            for vehicle_type in ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach']:
                if vehicle_type in vacancy_info[park_id]:
                    carpark[f'{vehicle_type}_vacancy'] = vacancy_info[park_id][vehicle_type].get('vacancy', 'N/A')
                    carpark[f'{vehicle_type}_vacancy_type'] = vacancy_info[park_id][vehicle_type].get('vacancy_type', '')

    return render_template('zh.result.html.j2', carparks=results, search_query=query)

@app.route('/follow/<username>')
@login_required
def follow(username):
    user = User.query.filter_by(username=username).first()
    if user is None:
        flash(_('User %(username)s not found.', username=username))
        return redirect(url_for('index'))
    if user == current_user:
        flash(_('You cannot follow yourself!'))
        return redirect(url_for('user', username=username))
    current_user.follow(user)
    db.session.commit()
    flash(_('You are following %(username)s!', username=username))
    return redirect(url_for('user', username=username))

@app.route('/unfollow/<username>')
@login_required
def unfollow(username):
    user = User.query.filter_by(username=username).first()
    if user is None:
        flash(_('User %(username)s not found.', username=username))
        return redirect(url_for('index'))
    if user == current_user:
        flash(_('You cannot unfollow yourself!'))
        return redirect(url_for('user', username=username))
    current_user.unfollow(user)
    db.session.commit()
    flash(_('You are not following %(username)s.', username=username))
    return redirect(url_for('user', username=username))

if __name__ == '__main__':
    app.run(debug=True)